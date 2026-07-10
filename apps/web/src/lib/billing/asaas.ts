import 'server-only';

import { timingSafeEqual } from 'node:crypto';

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

/** "YYYY-MM-DD" daqui a N dias (UTC) - dá folga pro cliente pagar cobrança avulsa. */
function daysFromNowISO(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
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
   * "YYYY-MM-DD" da 1ª cobrança. Default = hoje (contratação normal). Na REATIVAÇÃO passamos
   * o fim do período já pago pra 1ª cobrança cair só na renovação - senão cobraria de novo um
   * ciclo já pago (cobrança em dobro).
   */
  nextDueDateISO?: string;
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
      nextDueDate: input.nextDueDateISO ?? todayISO(),
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
    const invoiceUrl = fp.invoiceUrl ?? null;

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
 * Cobrança avulsa (one-time) para o customer. billingType UNDEFINED: o cliente escolhe
 * Pix/cartão/boleto na fatura hospedada. Não é assinatura, não mexe na recorrência. Usada
 * no setup do addon (`addon-setup:`) e no proporcional da ativação (`addon-prorata:`).
 */
export async function createOneTimeCharge(input: {
  customerId: string;
  amountCents: number;
  description: string;
  /** Referência determinística (ex.: `whatsapp-setup:<subId>`) p/ idempotência/reconciliação. */
  externalReference?: string;
}): Promise<{ paymentId: string; invoiceUrl: string | null }> {
  const payment = await asaas<{ id: string; invoiceUrl?: string | null }>('/payments', {
    method: 'POST',
    body: JSON.stringify({
      customer: input.customerId,
      billingType: 'UNDEFINED',
      value: input.amountCents / 100,
      // +3 dias: mesmo-dia aperta boleto/Pix (mesmo padrão de @haru/payments).
      dueDate: daysFromNowISO(3),
      description: input.description,
      externalReference: input.externalReference,
    }),
  });
  return { paymentId: payment.id, invoiceUrl: payment.invoiceUrl ?? null };
}

/**
 * Anual 12x no cartão: NÃO é assinatura recorrente e sim UMA venda parcelada (installment)
 * no cartão. `installmentValue` já traz as taxas de parcelamento embutidas (repassadas ao
 * cliente). O cartão é digitado na fatura hospedada (invoiceUrl) e o Asaas fixa as 12x; não
 * auto-renova ao fim das parcelas (renovar = re-contratar). externalReference =
 * Subscription.id puro - o webhook reconcilia por ele (installment não tem `subscription`).
 */
export async function createInstallmentCharge(input: {
  customerId: string;
  installmentCount: number;
  /** Valor de CADA parcela em centavos (com taxas de parcelamento já embutidas). */
  installmentCents: number;
  description: string;
  externalReference: string;
}): Promise<{ paymentId: string; invoiceUrl: string | null }> {
  const payment = await asaas<{ id: string; invoiceUrl?: string | null }>('/payments', {
    method: 'POST',
    body: JSON.stringify({
      customer: input.customerId,
      billingType: 'CREDIT_CARD',
      installmentCount: input.installmentCount,
      installmentValue: input.installmentCents / 100,
      dueDate: todayISO(),
      description: input.description,
      externalReference: input.externalReference,
    }),
  });
  return { paymentId: payment.id, invoiceUrl: payment.invoiceUrl ?? null };
}

/**
 * Cobrança avulsa PENDENTE já existente para uma referência - usada para NÃO duplicar
 * o setup quando o cliente clica de novo antes de pagar (idempotência no lado do Asaas).
 */
export async function findPendingChargeByReference(
  externalReference: string,
): Promise<{ paymentId: string; invoiceUrl: string | null } | null> {
  const res = await asaas<{ data: Array<{ id: string; invoiceUrl?: string | null }> }>(
    `/payments?externalReference=${encodeURIComponent(externalReference)}&status=PENDING&limit=1`,
  );
  const p = res.data[0];
  return p ? { paymentId: p.id, invoiceUrl: p.invoiceUrl ?? null } : null;
}

/**
 * Cancela (deleta) a cobrança avulsa PENDENTE de uma referência, se houver - usada quando o
 * cliente troca de canal do addon deixando um setup ainda não pago pra trás, pra ele não
 * pagar por engano uma cobrança que não vale mais. Só cancela PENDING (paga não se deleta).
 */
export async function cancelPendingChargeByReference(externalReference: string): Promise<void> {
  const pending = await findPendingChargeByReference(externalReference);
  if (pending) {
    await asaas(`/payments/${pending.paymentId}`, { method: 'DELETE' });
  }
}

/**
 * Atualiza valor/ciclo da assinatura (troca de plano). Sem proração. `updatePendingPayments`:
 * true (upgrade) reescreve também a cobrança já emitida deste ciclo; false (downgrade) deixa
 * a cobrança atual intacta e o novo valor só vale da próxima em diante - o "próximo ciclo".
 */
export async function updateAsaasSubscription(
  asaasSubscriptionId: string,
  input: {
    amountCents: number;
    cycle: BillingCycle;
    description: string;
    updatePendingPayments?: boolean;
  },
): Promise<void> {
  await asaas(`/subscriptions/${asaasSubscriptionId}`, {
    method: 'PUT',
    body: JSON.stringify({
      value: input.amountCents / 100,
      cycle: toAsaasCycle(input.cycle),
      description: input.description,
      updatePendingPayments: input.updatePendingPayments ?? true,
    }),
  });
}

/** Cancela a assinatura no Asaas (para as cobranças futuras). */
export async function cancelAsaasSubscription(asaasSubscriptionId: string): Promise<void> {
  await asaas(`/subscriptions/${asaasSubscriptionId}`, { method: 'DELETE' });
}

/**
 * Estorno integral de uma cobrança PAGA - usado no cancelamento dentro da garantia de
 * 30 dias ("reembolso integral automático"). O Asaas recusa estornar 2x a mesma cobrança;
 * o chamador tolera erro (o cancelamento nunca pode travar por causa do estorno).
 */
export async function refundAsaasPayment(paymentId: string): Promise<void> {
  await asaas(`/payments/${paymentId}/refund`, { method: 'POST' });
}

/** URL da fatura hospedada da cobrança PENDENTE (onde o cliente troca o cartão). */
export async function getPendingInvoiceUrl(asaasSubscriptionId: string): Promise<string | null> {
  const payments = await asaas<{ data: Array<{ invoiceUrl?: string | null }> }>(
    `/subscriptions/${asaasSubscriptionId}/payments?status=PENDING&limit=1`,
  );
  return payments.data[0]?.invoiceUrl ?? null;
}

// --- Trocar forma de pagamento ----------------------------------------------

/** Últimos 4 + bandeira do cartão tokenizado (o resto o Asaas guarda; nós NÃO). */
export interface CardTokenResult {
  /** creditCardToken do Asaas - NÃO é dado de cartão; permite recobrar sem redigitar. */
  token: string;
  /** Últimos 4 dígitos (creditCardNumber que o Asaas devolve mascarado). */
  last4: string;
  /** Bandeira detectada pelo Asaas (VISA, MASTERCARD, ...). */
  brand: string;
}

/**
 * Tokeniza o cartão no Asaas e devolve token + últimos 4 + bandeira. O PAN/CVV é REPASSADO
 * ao Asaas (TLS) e NÃO é persistido nem logado aqui - guardamos só o token. Exige os dados
 * do titular (`creditCardHolderInfo`) e o IP do cliente (`remoteIp`), requisito antifraude do
 * Asaas. Ver `/creditCard/tokenizeCreditCard` na doc Asaas v3.
 */
export async function tokenizeCard(input: {
  customerId: string;
  /** IP público do cliente (x-forwarded-for). Requisito do Asaas na tokenização. */
  remoteIp: string;
  card: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
  holder: {
    name: string;
    email?: string | null;
    cpfCnpj: string;
    postalCode: string;
    addressNumber: string;
    phoneE164?: string | null;
  };
}): Promise<CardTokenResult> {
  const res = await asaas<{
    creditCardNumber: string;
    creditCardBrand: string;
    creditCardToken: string;
  }>('/creditCard/tokenizeCreditCard', {
    method: 'POST',
    body: JSON.stringify({
      customer: input.customerId,
      creditCard: {
        holderName: input.card.holderName,
        number: input.card.number,
        expiryMonth: input.card.expiryMonth,
        expiryYear: input.card.expiryYear,
        ccv: input.card.ccv,
      },
      creditCardHolderInfo: {
        name: input.holder.name,
        email: input.holder.email ?? undefined,
        cpfCnpj: input.holder.cpfCnpj,
        postalCode: input.holder.postalCode,
        addressNumber: input.holder.addressNumber,
        phone: input.holder.phoneE164 ? toNationalPhone(input.holder.phoneE164) : undefined,
      },
      remoteIp: input.remoteIp,
    }),
  });
  return { token: res.creditCardToken, last4: res.creditCardNumber, brand: res.creditCardBrand };
}

/**
 * Aponta a recorrência para um cartão já tokenizado (billingType CREDIT_CARD). Reescreve
 * também a cobrança em aberto deste ciclo (`updatePendingPayments: true`) para o novo cartão
 * valer já. O cartão em si não passa por aqui - só o token.
 */
export async function setSubscriptionCard(
  asaasSubscriptionId: string,
  creditCardToken: string,
): Promise<void> {
  await asaas(`/subscriptions/${asaasSubscriptionId}`, {
    method: 'PUT',
    body: JSON.stringify({
      billingType: 'CREDIT_CARD',
      creditCardToken,
      updatePendingPayments: true,
    }),
  });
}

/**
 * Troca a recorrência para Pix (billingType PIX) e devolve o QR + copia-e-cola da cobrança em
 * aberto, se houver (null quando o ciclo atual já está pago - o Pix passa a valer da próxima).
 *
 * ponytail: hoje isto é Pix POR CICLO (o Asaas emite uma cobrança Pix a cada renovação e o
 * cliente paga o QR). O "Pix Automático" (autoriza-uma-vez, debita sozinho) é produto Bacen/
 * Asaas que precisa estar habilitado na conta; quando estiver, a autorização recorrente entra
 * aqui (guardar o id em Subscription.pixRecurringId) - a assinatura e a UI já carregam o campo.
 */
export async function setSubscriptionPix(
  asaasSubscriptionId: string,
): Promise<{ qrCode: string; copyPaste: string } | null> {
  await asaas(`/subscriptions/${asaasSubscriptionId}`, {
    method: 'PUT',
    body: JSON.stringify({ billingType: 'PIX', updatePendingPayments: true }),
  });
  const payments = await asaas<{ data: Array<{ id: string }> }>(
    `/subscriptions/${asaasSubscriptionId}/payments?status=PENDING&limit=1`,
  );
  const p = payments.data[0];
  if (!p) return null;
  const qr = await asaas<{ encodedImage: string; payload: string }>(`/payments/${p.id}/pixQrCode`);
  return { qrCode: `data:image/png;base64,${qr.encodedImage}`, copyPaste: qr.payload };
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

/** Status do Asaas que contam como "cobrança paga" (elegível a estorno). */
const PAID_STATUSES = ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'];

/**
 * id da última cobrança efetivamente PAGA da assinatura (a lista vem em ordem desc),
 * para estornar no cancelamento dentro da garantia. null se nada foi pago ainda.
 */
export async function findLastPaidCharge(asaasSubscriptionId: string): Promise<string | null> {
  const charges = await listSubscriptionPayments(asaasSubscriptionId);
  return charges.find((c) => PAID_STATUSES.includes(c.status))?.id ?? null;
}

// --- Notas Fiscais (NFS-e) --------------------------------------------------

/**
 * Config fiscal lida de env. null quando não configurada (Configurações Fiscais só existem
 * na conta Asaas depois de inscrição municipal + certificado + serviço - trabalho de painel,
 * não de código). Sem isto o gancho de NF fica em modo-marcador (não chama o Asaas). Envie
 * `ASAAS_NF_MUNICIPAL_SERVICE_ID` (quando há lista de serviços) OU `_CODE`; um dos dois.
 * Impostos default = 0 e ISS não retido (caso comum de emissor no Simples Nacional).
 */
export interface NfConfig {
  serviceDescription: string;
  municipalServiceId: string | null;
  municipalServiceCode: string | null;
  municipalServiceName: string | null;
  observations: string | null;
  taxes: { retainIss: boolean; iss: number; cofins: number; csll: number; inss: number; ir: number; pis: number };
}

function envNum(name: string): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) ? n : 0;
}

export function nfConfig(): NfConfig | null {
  const serviceDescription = process.env.ASAAS_NF_SERVICE_DESCRIPTION?.trim();
  const municipalServiceId = process.env.ASAAS_NF_MUNICIPAL_SERVICE_ID?.trim() || null;
  const municipalServiceCode = process.env.ASAAS_NF_MUNICIPAL_SERVICE_CODE?.trim() || null;
  // Gate: sem descrição do serviço OU sem identificação do serviço municipal, não emite.
  if (!serviceDescription || (!municipalServiceId && !municipalServiceCode)) {
    return null;
  }
  return {
    serviceDescription,
    municipalServiceId,
    municipalServiceCode,
    municipalServiceName: process.env.ASAAS_NF_MUNICIPAL_SERVICE_NAME?.trim() || null,
    observations: process.env.ASAAS_NF_OBSERVATIONS?.trim() || null,
    taxes: {
      retainIss: process.env.ASAAS_NF_RETAIN_ISS === 'true',
      iss: envNum('ASAAS_NF_TAX_ISS'),
      cofins: envNum('ASAAS_NF_TAX_COFINS'),
      csll: envNum('ASAAS_NF_TAX_CSLL'),
      inss: envNum('ASAAS_NF_TAX_INSS'),
      ir: envNum('ASAAS_NF_TAX_IR'),
      pis: envNum('ASAAS_NF_TAX_PIS'),
    },
  };
}

/**
 * Agenda a NFS-e de uma cobrança paga. `payment` = id do pagamento no Asaas: o tomador (o
 * tenant) é preenchido automaticamente pelo cliente do pagamento, não precisamos repassar
 * documento/endereço. `effectiveDate = hoje` + authorize() a seguir emite na hora. Retorna
 * o id da nota (status inicial SCHEDULED) - a autorização volta assíncrona por webhook.
 */
export async function scheduleInvoice(input: {
  asaasPaymentId: string;
  valueCents: number;
  externalReference: string;
}): Promise<{ id: string; status: string }> {
  const cfg = nfConfig();
  if (!cfg) throw new BillingConfigError('Config fiscal (ASAAS_NF_*) ausente');
  const invoice = await asaas<{ id: string; status: string }>('/invoices', {
    method: 'POST',
    body: JSON.stringify({
      payment: input.asaasPaymentId,
      serviceDescription: cfg.serviceDescription,
      observations: cfg.observations ?? undefined,
      value: input.valueCents / 100,
      deductions: 0,
      effectiveDate: todayISO(),
      externalReference: input.externalReference,
      municipalServiceId: cfg.municipalServiceId ?? undefined,
      municipalServiceCode: cfg.municipalServiceCode ?? undefined,
      municipalServiceName: cfg.municipalServiceName ?? undefined,
      // Não deixar o Asaas reescrever a cobrança (só emitir a nota sobre ela).
      updatePayment: false,
      taxes: cfg.taxes,
    }),
  });
  return { id: invoice.id, status: invoice.status };
}

/** Dispara a emissão imediata da nota agendada (senão o Asaas emitiria só na effectiveDate). */
export async function authorizeInvoice(invoiceId: string): Promise<void> {
  await asaas(`/invoices/${invoiceId}/authorize`, { method: 'POST' });
}

// --- Webhook ----------------------------------------------------------------

/** Dados de nota fiscal num evento INVOICE_* do webhook. */
export interface ParsedInvoiceEvent {
  /** invoice.id no Asaas (reconcilia com Charge.asaasInvoiceId). */
  asaasInvoiceId: string;
  /** id do pagamento vinculado (fallback de reconciliação). */
  asaasPaymentId: string | null;
  status: string | null;
  /** Link do PDF da nota autorizada. */
  pdfUrl: string | null;
  /** Número fiscal da nota autorizada. */
  number: string | null;
  /** Mensagem de erro (INVOICE_ERROR). */
  error: string | null;
}

/** Resultado simplificado de um evento de webhook de billing. */
export interface ParsedBillingEvent {
  /** Nome bruto do evento Asaas (PAYMENT_CREATED, SUBSCRIPTION_DELETED, ...) pro ledger. */
  event: string | null;
  /**
   * id da assinatura Asaas: `payment.subscription` (cobrança recorrente) OU `subscription.id`
   * (eventos SUBSCRIPTION_*). null em cobrança avulsa/installment.
   */
  asaasSubscriptionId: string | null;
  /** id da cobrança no Asaas (payment.id) - usado pra deduplicar CONFIRMED/RECEIVED. */
  asaasPaymentId: string | null;
  /** Referência que enviamos ao criar cobranças avulsas (ex.: `addon-setup:<subId>`). */
  externalReference: string | null;
  /** Valor da cobrança em centavos (payment.value × 100), pro recibo/ledger. */
  amountCents: number | null;
  /** Forma de pagamento da cobrança (CREDIT_CARD, PIX, ...). null em eventos sem payment. */
  billingType: string | null;
  /** Últimos 4 + bandeira quando a cobrança foi no cartão (pra exibir "•••• 4242"). */
  cardLast4: string | null;
  cardBrand: string | null;
  /** Vencimento da cobrança (payment.dueDate). null em eventos sem payment. */
  dueDate: Date | null;
  /** Efeito no nosso Subscription.status, ou null pra eventos ignorados. */
  effect: 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | null;
  paidAt: Date | null;
  /** Dados da nota fiscal nos eventos INVOICE_* (null nos demais). */
  invoice: ParsedInvoiceEvent | null;
}

/**
 * Valida o token do webhook (header `asaas-access-token` vs env) e mapeia o evento.
 * Lança BillingConfigError se o token não bater.
 */
export function parseBillingWebhook(rawBody: Buffer, headers: Headers): ParsedBillingEvent {
  const expected = process.env.ASAAS_PLATFORM_WEBHOOK_TOKEN;
  // Fail-closed: sem o token da plataforma configurado NÃO dá pra autenticar o callback.
  // Recusa em vez de aceitar cego - senão um POST forjado ativaria/derrubaria assinaturas.
  if (!expected) {
    throw new BillingConfigError('ASAAS_PLATFORM_WEBHOOK_TOKEN não configurada');
  }
  const received = headers.get('asaas-access-token') ?? '';
  // Comparação em tempo constante (guarda de comprimento antes do timingSafeEqual).
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new BillingConfigError('Token do webhook de billing inválido');
  }

  let body: {
    event?: string;
    payment?: {
      id?: string | null;
      subscription?: string | null;
      externalReference?: string | null;
      billingType?: string | null;
      dueDate?: string | null;
      paymentDate?: string | null;
      value?: number | null;
      /** Cartão usado na cobrança (o Asaas devolve mascarado - só últimos 4 + bandeira). */
      creditCard?: { creditCardNumber?: string | null; creditCardBrand?: string | null } | null;
    };
    /** Eventos SUBSCRIPTION_* trazem a assinatura aqui (não em `payment`). */
    subscription?: { id?: string | null };
    /** Eventos INVOICE_* trazem a nota fiscal aqui. */
    invoice?: {
      id?: string | null;
      payment?: string | null;
      status?: string | null;
      pdfUrl?: string | null;
      number?: string | null;
      // O Asaas expõe o motivo do erro em campos que variam por prefeitura; captura best-effort.
      error?: string | null;
      errorMessage?: string | null;
      rejectionReason?: string | null;
    };
  };
  try {
    body = JSON.parse(rawBody.toString('utf8'));
  } catch {
    throw new BillingConfigError('Corpo do webhook de billing não é JSON válido');
  }

  const event = body.event ?? null;
  const asaasSubscriptionId = body.payment?.subscription ?? body.subscription?.id ?? null;
  const asaasPaymentId = body.payment?.id ?? null;
  const externalReference = body.payment?.externalReference ?? null;
  const billingType = body.payment?.billingType ?? null;
  const cardLast4 = body.payment?.creditCard?.creditCardNumber ?? null;
  const cardBrand = body.payment?.creditCard?.creditCardBrand ?? null;
  const dueDate = body.payment?.dueDate ? new Date(body.payment.dueDate) : null;
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

  const invoice: ParsedInvoiceEvent | null = body.invoice?.id
    ? {
        asaasInvoiceId: body.invoice.id,
        asaasPaymentId: body.invoice.payment ?? null,
        status: body.invoice.status ?? null,
        pdfUrl: body.invoice.pdfUrl ?? null,
        number: body.invoice.number ?? null,
        error:
          body.invoice.error ?? body.invoice.errorMessage ?? body.invoice.rejectionReason ?? null,
      }
    : null;

  return {
    event,
    asaasSubscriptionId,
    asaasPaymentId,
    externalReference,
    amountCents,
    billingType,
    cardLast4,
    cardBrand,
    dueDate,
    effect,
    paidAt,
    invoice,
  };
}
