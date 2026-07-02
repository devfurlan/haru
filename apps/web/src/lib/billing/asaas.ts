import 'server-only';

/**
 * Cliente Asaas da PLATAFORMA (cobrança da assinatura do SaaS). Diferente do
 * `@haru/payments` (chave Asaas de cada tenant para o tenant cobrar os clientes dele):
 * aqui usamos UMA chave da plataforma (env) para cobrar o tenant pela assinatura, via
 * API de Subscriptions (recorrência).
 *
 * SEGURANÇA: o cartão NÃO passa pelo nosso servidor. Criamos a assinatura e mandamos o
 * cliente para a fatura hospedada do Asaas (invoiceUrl) digitar o cartão; o Asaas guarda
 * o token e cobra automático nos ciclos seguintes. Pix gera um QR por ciclo. Requer:
 *   ASAAS_PLATFORM_API_KEY, ASAAS_PLATFORM_SANDBOX, ASAAS_PLATFORM_WEBHOOK_TOKEN
 */

import type { BillingCycle } from '@haru/database';

const PROD_BASE = 'https://api.asaas.com/v3';
const SANDBOX_BASE = 'https://api-sandbox.asaas.com/v3';

function config(): { apiKey: string; baseUrl: string } {
  const apiKey = process.env.ASAAS_PLATFORM_API_KEY;
  if (!apiKey) {
    throw new BillingConfigError('ASAAS_PLATFORM_API_KEY não configurada');
  }
  const sandbox = process.env.ASAAS_PLATFORM_SANDBOX === 'true';
  return { apiKey, baseUrl: sandbox ? SANDBOX_BASE : PROD_BASE };
}

/** Erro de configuração/ambiente do billing (chave ausente, token inválido, etc.). */
export class BillingConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BillingConfigError';
  }
}

async function asaas<T>(path: string, init?: RequestInit): Promise<T> {
  const { apiKey, baseUrl } = config();
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      access_token: apiKey,
      'User-Agent': 'Demandae-Billing',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Asaas ${path} respondeu ${res.status}: ${detail.slice(0, 400)}`);
  }
  return res.json() as Promise<T>;
}

/** "YYYY-MM-DD" (Asaas espera data sem hora no nextDueDate). */
function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** E.164 ("5511912345678") → nacional ("11912345678") pro Asaas. */
function toNationalPhone(phoneE164: string): string {
  const digits = phoneE164.replace(/\D/g, '');
  return digits.startsWith('55') && digits.length > 11 ? digits.slice(2) : digits;
}

/** MONTHLY/ANNUAL (nosso) → cycle do Asaas. */
function toAsaasCycle(cycle: BillingCycle): 'MONTHLY' | 'YEARLY' {
  return cycle === 'ANNUAL' ? 'YEARLY' : 'MONTHLY';
}

// --- Customer ---------------------------------------------------------------

interface CustomerInput {
  name: string;
  cpfCnpj: string;
  email?: string | null;
  phoneE164?: string | null;
  externalReference: string;
}

/** Cria um customer no Asaas e devolve o id. O chamador reusa o id (asaasCustomerId). */
export async function createCustomer(input: CustomerInput): Promise<string> {
  const customer = await asaas<{ id: string }>('/customers', {
    method: 'POST',
    body: JSON.stringify({
      name: input.name,
      cpfCnpj: input.cpfCnpj,
      email: input.email ?? undefined,
      mobilePhone: input.phoneE164 ? toNationalPhone(input.phoneE164) : undefined,
      externalReference: input.externalReference,
      // NÃO deixar o Asaas notificar o tenant (e-mail/SMS de cobrança). Quem fala com
      // o cliente sobre billing somos nós (e-mails via Resend). Desliga tudo no customer.
      notificationDisabled: true,
    }),
  });
  return customer.id;
}

// --- Subscription -----------------------------------------------------------

export type BillingMethod = 'CREDIT_CARD' | 'PIX';

interface CreateSubscriptionInput {
  customerId: string;
  /** Valor do ciclo em centavos (mensal ou anual, conforme o cycle). */
  amountCents: number;
  cycle: BillingCycle;
  method: BillingMethod;
  description: string;
  /** Nosso Subscription.id - volta no webhook (externalReference) pra reconciliar. */
  externalReference: string;
  /**
   * Setup único (centavos) a somar SÓ na 1ª cobrança - os ciclos seguintes continuam
   * no `amountCents`. 0/undefined = sem setup (ex.: anual). Ver SETUP_FEE_CENTS.
   */
  setupFeeCents?: number;
}

export interface SubscriptionResult {
  asaasSubscriptionId: string;
  /** Status do Asaas na criação (a confirmação do pagamento vem por webhook). */
  status: string;
  /** Dados da 1ª cobrança pra prosseguir o checkout. */
  firstPayment: {
    paymentId: string;
    /** Fatura hospedada do Asaas - destino do cartão (o cartão é digitado lá, não aqui). */
    invoiceUrl: string | null;
    /** Pix: QR + copia-e-cola (null no cartão). */
    pix: { qrCode: string; copyPaste: string } | null;
  } | null;
}

/**
 * Cria a assinatura recorrente no Asaas. Cartão → recorrência automática após o cliente
 * digitar o cartão na fatura hospedada (invoiceUrl). Pix → um Pix por ciclo (retorna QR).
 */
export async function createSubscription(
  input: CreateSubscriptionInput,
): Promise<SubscriptionResult> {
  const sub = await asaas<{ id: string; status: string }>('/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      customer: input.customerId,
      billingType: input.method,
      value: input.amountCents / 100,
      nextDueDate: todayISO(),
      cycle: toAsaasCycle(input.cycle),
      description: input.description,
      externalReference: input.externalReference,
    }),
  });

  // A 1ª cobrança é gerada na hora; busca pra obter a fatura (cartão) ou o QR (Pix).
  const payments = await asaas<{ data: Array<{ id: string; invoiceUrl?: string | null }> }>(
    `/subscriptions/${sub.id}/payments?limit=1`,
  );
  const fp = payments.data[0];
  let firstPayment: SubscriptionResult['firstPayment'] = null;
  if (fp) {
    let invoiceUrl = fp.invoiceUrl ?? null;

    // Setup único: engorda SÓ a 1ª cobrança (a assinatura segue cobrando `amountCents`
    // nos ciclos seguintes). Feito antes de gerar o QR do Pix pra refletir o total.
    if (input.setupFeeCents && input.setupFeeCents > 0) {
      const updated = await asaas<{ invoiceUrl?: string | null }>(`/payments/${fp.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          value: (input.amountCents + input.setupFeeCents) / 100,
          description: `${input.description} + configuração assistida (setup único)`,
        }),
      });
      invoiceUrl = updated.invoiceUrl ?? invoiceUrl;
    }

    let pix: { qrCode: string; copyPaste: string } | null = null;
    if (input.method === 'PIX') {
      const qr = await asaas<{ encodedImage: string; payload: string }>(
        `/payments/${fp.id}/pixQrCode`,
      );
      pix = { qrCode: `data:image/png;base64,${qr.encodedImage}`, copyPaste: qr.payload };
    }
    firstPayment = { paymentId: fp.id, invoiceUrl, pix };
  }

  return { asaasSubscriptionId: sub.id, status: sub.status, firstPayment };
}

/**
 * Cobrança avulsa (one-time) para o customer - usada no setup OPCIONAL do WhatsApp
 * contratado depois do checkout (na ativação). billingType UNDEFINED: o cliente escolhe
 * Pix/cartão/boleto na fatura hospedada. Não é assinatura, não mexe na recorrência.
 */
export async function createOneTimeCharge(input: {
  customerId: string;
  amountCents: number;
  description: string;
}): Promise<{ paymentId: string; invoiceUrl: string | null }> {
  const payment = await asaas<{ id: string; invoiceUrl?: string | null }>('/payments', {
    method: 'POST',
    body: JSON.stringify({
      customer: input.customerId,
      billingType: 'UNDEFINED',
      value: input.amountCents / 100,
      dueDate: todayISO(),
      description: input.description,
    }),
  });
  return { paymentId: payment.id, invoiceUrl: payment.invoiceUrl ?? null };
}

/** Atualiza valor/ciclo da assinatura (troca de plano). Sem proração - o novo valor
 *  vale a partir do próximo ciclo; `updatePendingPayments` ajusta cobranças em aberto. */
export async function updateAsaasSubscription(
  asaasSubscriptionId: string,
  input: { amountCents: number; cycle: BillingCycle; description: string },
): Promise<void> {
  await asaas(`/subscriptions/${asaasSubscriptionId}`, {
    method: 'PUT',
    body: JSON.stringify({
      value: input.amountCents / 100,
      cycle: toAsaasCycle(input.cycle),
      description: input.description,
      updatePendingPayments: true,
    }),
  });
}

/** Cancela a assinatura no Asaas (para as cobranças futuras). */
export async function cancelAsaasSubscription(asaasSubscriptionId: string): Promise<void> {
  await asaas(`/subscriptions/${asaasSubscriptionId}`, { method: 'DELETE' });
}

/** URL da fatura hospedada da cobrança PENDENTE (onde o cliente troca o cartão). */
export async function getPendingInvoiceUrl(asaasSubscriptionId: string): Promise<string | null> {
  const payments = await asaas<{ data: Array<{ invoiceUrl?: string | null }> }>(
    `/subscriptions/${asaasSubscriptionId}/payments?status=PENDING&limit=1`,
  );
  return payments.data[0]?.invoiceUrl ?? null;
}

/** Uma cobrança da assinatura (linha do histórico). */
export interface BillingCharge {
  id: string;
  amountCents: number;
  /** Status bruto do Asaas (PENDING, RECEIVED, CONFIRMED, OVERDUE, REFUNDED, ...). */
  status: string;
  dueDate: string | null;
  paidAt: string | null;
  invoiceUrl: string | null;
  billingType: string | null;
}

/** Lista as cobranças da assinatura (mais recentes primeiro) para o histórico. */
export async function listSubscriptionPayments(
  asaasSubscriptionId: string,
  limit = 24,
): Promise<BillingCharge[]> {
  const res = await asaas<{
    data: Array<{
      id: string;
      value?: number | null;
      status?: string | null;
      dueDate?: string | null;
      paymentDate?: string | null;
      invoiceUrl?: string | null;
      billingType?: string | null;
    }>;
  }>(`/subscriptions/${asaasSubscriptionId}/payments?limit=${limit}&offset=0&order=desc`);

  return res.data.map((p) => ({
    id: p.id,
    amountCents: typeof p.value === 'number' ? Math.round(p.value * 100) : 0,
    status: p.status ?? 'PENDING',
    dueDate: p.dueDate ?? null,
    paidAt: p.paymentDate ?? null,
    invoiceUrl: p.invoiceUrl ?? null,
    billingType: p.billingType ?? null,
  }));
}

// --- Webhook ----------------------------------------------------------------

/** Resultado simplificado de um evento de webhook de billing. */
export interface ParsedBillingEvent {
  /** id da subscription no Asaas (payment.subscription). null se o evento não for de assinatura. */
  asaasSubscriptionId: string | null;
  /** id da cobrança no Asaas (payment.id) - usado pra deduplicar CONFIRMED/RECEIVED. */
  asaasPaymentId: string | null;
  /** Valor da cobrança em centavos (payment.value × 100), pro recibo. */
  amountCents: number | null;
  /** Efeito no nosso Subscription.status, ou null pra eventos ignorados. */
  effect: 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | null;
  paidAt: Date | null;
}

/**
 * Valida o token do webhook (header `asaas-access-token` vs env) e mapeia o evento.
 * Lança BillingConfigError se o token não bater.
 */
export function parseBillingWebhook(rawBody: Buffer, headers: Headers): ParsedBillingEvent {
  const expected = process.env.ASAAS_PLATFORM_WEBHOOK_TOKEN;
  if (expected) {
    const received = headers.get('asaas-access-token') ?? '';
    if (received !== expected) {
      throw new BillingConfigError('Token do webhook de billing inválido');
    }
  }

  let body: {
    event?: string;
    payment?: {
      id?: string | null;
      subscription?: string | null;
      paymentDate?: string | null;
      value?: number | null;
    };
  };
  try {
    body = JSON.parse(rawBody.toString('utf8'));
  } catch {
    throw new BillingConfigError('Corpo do webhook de billing não é JSON válido');
  }

  const asaasSubscriptionId = body.payment?.subscription ?? null;
  const asaasPaymentId = body.payment?.id ?? null;
  const amountCents =
    typeof body.payment?.value === 'number' ? Math.round(body.payment.value * 100) : null;

  let effect: ParsedBillingEvent['effect'] = null;
  switch (body.event) {
    case 'PAYMENT_CONFIRMED':
    case 'PAYMENT_RECEIVED':
      effect = 'ACTIVE';
      break;
    case 'PAYMENT_OVERDUE':
      effect = 'PAST_DUE';
      break;
    case 'PAYMENT_DELETED':
    case 'PAYMENT_REFUNDED':
    case 'PAYMENT_CHARGEBACK_REQUESTED':
      effect = 'SUSPENDED';
      break;
    default:
      effect = null;
  }

  const paidAt =
    effect === 'ACTIVE'
      ? body.payment?.paymentDate
        ? new Date(body.payment.paymentDate)
        : new Date()
      : null;

  return { asaasSubscriptionId, asaasPaymentId, amountCents, effect, paidAt };
}
