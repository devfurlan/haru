import { timingSafeEqual } from 'node:crypto';

import {
  type CreateChargeInput,
  type CreateChargeResult,
  type CreateSubscriptionInput,
  type CreateSubscriptionResult,
  type ParsedWebhook,
  type ParseWebhookArgs,
  type PaymentGateway,
  PaymentConfigError,
} from './types';

/**
 * Adapter real do Asaas (https://docs.asaas.com).
 *
 * - Auth via header `access_token` (não Bearer).
 * - `createCharge` cria/usa um customer e abre uma cobrança; pra Pix busca o QR.
 * - Cartão usa a `invoiceUrl` hospedada do Asaas → cartão fica fora do nosso PCI.
 * - Valores no Asaas são em REAIS decimais; nosso domínio usa centavos. Converter.
 */

const PROD_BASE = 'https://api.asaas.com/v3';
const SANDBOX_BASE = 'https://api-sandbox.asaas.com/v3';

interface AsaasConfig {
  apiKey: string;
  sandbox: boolean;
}

interface AsaasPaymentResponse {
  id: string;
  status: string;
  invoiceUrl?: string | null;
}

interface AsaasPixQrCodeResponse {
  encodedImage: string;
  payload: string;
  expirationDate?: string | null;
}

/** "YYYY-MM-DD" no formato esperado pelo Asaas (dueDate). */
function toAsaasDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** E.164 ("5511912345678") → número nacional ("11912345678") pro Asaas. */
function toNationalPhone(phoneE164: string): string {
  const digits = phoneE164.replace(/\D/g, '');
  return digits.startsWith('55') && digits.length > 11 ? digits.slice(2) : digits;
}

export class AsaasGateway implements PaymentGateway {
  readonly provider = 'ASAAS' as const;
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(config: AsaasConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.sandbox ? SANDBOX_BASE : PROD_BASE;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        access_token: this.apiKey,
        'User-Agent': 'Demandae',
        ...(init?.headers ?? {}),
      },
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Asaas ${path} respondeu ${res.status}: ${detail.slice(0, 300)}`);
    }
    return (await res.json()) as T;
  }

  async createCharge(input: CreateChargeInput): Promise<CreateChargeResult> {
    // 1) Cria o customer (MVP: cria inline; otimização futura guarda asaasCustomerId).
    const customer = await this.request<{ id: string }>('/customers', {
      method: 'POST',
      body: JSON.stringify({
        name: input.customer.name,
        cpfCnpj: input.customer.cpfCnpj ?? undefined,
        mobilePhone: input.customer.phoneE164
          ? toNationalPhone(input.customer.phoneE164)
          : undefined,
        email: input.customer.email ?? undefined,
        externalReference: input.externalReference,
      }),
    });

    // 2) Abre a cobrança. value em REAIS (centavos / 100).
    const dueDate = input.dueDate ?? new Date(Date.now() + 24 * 60 * 60 * 1000);
    const payment = await this.request<AsaasPaymentResponse>('/payments', {
      method: 'POST',
      body: JSON.stringify({
        customer: customer.id,
        billingType: input.method,
        value: input.amountCents / 100,
        dueDate: toAsaasDate(dueDate),
        description: input.description,
        externalReference: input.externalReference,
      }),
    });

    let pixQrCode: string | null = null;
    let pixCopyPaste: string | null = null;
    let expiresAt: Date | null = null;

    // 3) Pix: busca o QR. GET deve ir com body vazio (senão Asaas pode dar 403).
    if (input.method === 'PIX') {
      const qr = await this.request<AsaasPixQrCodeResponse>(`/payments/${payment.id}/pixQrCode`, {
        method: 'GET',
      });
      pixQrCode = `data:image/png;base64,${qr.encodedImage}`;
      pixCopyPaste = qr.payload;
      expiresAt = qr.expirationDate ? new Date(qr.expirationDate) : dueDate;
    } else {
      expiresAt = dueDate;
    }

    return {
      externalId: payment.id,
      checkoutUrl: payment.invoiceUrl ?? null,
      pixQrCode,
      pixCopyPaste,
      status: mapAsaasPaymentStatus(payment.status),
      expiresAt,
    };
  }

  async createSubscription(input: CreateSubscriptionInput): Promise<CreateSubscriptionResult> {
    // 1) Customer estável (reusado entre renovações; o Asaas guarda o cartão nele).
    const customer = await this.request<{ id: string }>('/customers', {
      method: 'POST',
      body: JSON.stringify({
        name: input.customer.name,
        cpfCnpj: input.customer.cpfCnpj,
        email: input.customer.email ?? undefined,
        mobilePhone: input.customer.phoneE164
          ? toNationalPhone(input.customer.phoneE164)
          : undefined,
        externalReference: input.externalReference,
        // Quem fala com o cliente sobre a assinatura somos nós (push/WhatsApp/e-mail);
        // desliga as notificações de cobrança do próprio Asaas pra não duplicar.
        notificationDisabled: true,
      }),
    });

    // 2) Assinatura recorrente. nextDueDate = data da 1ª cobrança (hoje = cobra já). O
    // Asaas gera a cobrança de cada ciclo e faz o dunning nativo - não cobramos em loop.
    const firstDue = input.firstDueDate ?? new Date();
    const sub = await this.request<{ id: string; status: string }>('/subscriptions', {
      method: 'POST',
      body: JSON.stringify({
        customer: customer.id,
        billingType: input.method,
        value: input.amountCents / 100,
        nextDueDate: toAsaasDate(firstDue),
        cycle: 'MONTHLY',
        description: input.description,
        externalReference: input.externalReference,
      }),
    });

    // 3) A 1ª cobrança já nasce; busca pra pegar a fatura hospedada (cartão) ou o QR (Pix).
    const payments = await this.request<{
      data: Array<{ id: string; invoiceUrl?: string | null }>;
    }>(`/subscriptions/${sub.id}/payments?limit=1`, { method: 'GET' });
    const fp = payments.data[0];

    let firstCharge: CreateSubscriptionResult['firstCharge'] = null;
    if (fp) {
      let pixQrCode: string | null = null;
      let pixCopyPaste: string | null = null;
      if (input.method === 'PIX') {
        const qr = await this.request<AsaasPixQrCodeResponse>(`/payments/${fp.id}/pixQrCode`, {
          method: 'GET',
        });
        pixQrCode = `data:image/png;base64,${qr.encodedImage}`;
        pixCopyPaste = qr.payload;
      }
      firstCharge = {
        externalId: fp.id,
        checkoutUrl: fp.invoiceUrl ?? null,
        pixQrCode,
        pixCopyPaste,
      };
    }

    return {
      externalSubscriptionId: sub.id,
      gatewayCustomerId: customer.id,
      status: sub.status,
      firstCharge,
    };
  }

  async cancelSubscription(externalSubscriptionId: string): Promise<void> {
    await this.request(`/subscriptions/${externalSubscriptionId}`, { method: 'DELETE' });
  }

  parseWebhook({ rawBody, headers, webhookToken }: ParseWebhookArgs): ParsedWebhook {
    // Autenticidade: header `asaas-access-token` deve bater com o token do tenant.
    // Fail-closed: sem token não há como validar a origem - recusa em vez de aceitar cego.
    if (!webhookToken) {
      throw new PaymentConfigError('Webhook Asaas sem token de validação configurado');
    }
    const received = headers.get('asaas-access-token') ?? '';
    const a = Buffer.from(received);
    const b = Buffer.from(webhookToken);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new PaymentConfigError('Token do webhook Asaas inválido');
    }

    let body: {
      event?: string;
      payment?: {
        id?: string;
        /** Presente quando a cobrança pertence a uma assinatura recorrente. */
        subscription?: string | null;
        externalReference?: string | null;
        billingType?: string | null;
        dueDate?: string | null;
        paymentDate?: string | null;
        value?: number | null;
        /** Cartão mascarado que o Asaas devolve (só últimos 4 + bandeira). */
        creditCard?: { creditCardNumber?: string | null; creditCardBrand?: string | null } | null;
      };
    };
    try {
      body = JSON.parse(rawBody.toString('utf8'));
    } catch {
      throw new PaymentConfigError('Corpo do webhook Asaas não é JSON válido');
    }

    const externalId = body.payment?.id;
    if (!externalId) {
      throw new PaymentConfigError('Webhook Asaas sem payment.id');
    }

    const status = mapAsaasEvent(body.event);
    const paidAt =
      status === 'PAID'
        ? body.payment?.paymentDate
          ? new Date(body.payment.paymentDate)
          : new Date()
        : null;

    return {
      externalId,
      status,
      paidAt,
      // Recorrência: preenchido só quando a cobrança pertence a uma assinatura.
      subscriptionExternalId: body.payment?.subscription ?? null,
      event: body.event ?? null,
      externalReference: body.payment?.externalReference ?? null,
      amountCents:
        typeof body.payment?.value === 'number' ? Math.round(body.payment.value * 100) : null,
      cardLast4: body.payment?.creditCard?.creditCardNumber ?? null,
      cardBrand: body.payment?.creditCard?.creditCardBrand ?? null,
      dueDate: body.payment?.dueDate ? new Date(body.payment.dueDate) : null,
    };
  }
}

/** Status de cobrança do Asaas → status simplificado do `createCharge`. */
function mapAsaasPaymentStatus(status: string): 'PENDING' | 'PAID' | 'FAILED' {
  if (status === 'RECEIVED' || status === 'CONFIRMED' || status === 'RECEIVED_IN_CASH')
    return 'PAID';
  if (status === 'REFUNDED' || status === 'CHARGEBACK_REQUESTED') return 'FAILED';
  return 'PENDING';
}

/** Evento de webhook do Asaas → status do nosso `Payment`. */
function mapAsaasEvent(event: string | undefined): ParsedWebhook['status'] {
  switch (event) {
    case 'PAYMENT_RECEIVED':
    case 'PAYMENT_CONFIRMED':
    case 'PAYMENT_RECEIVED_IN_CASH':
      return 'PAID';
    case 'PAYMENT_OVERDUE':
      return 'EXPIRED';
    case 'PAYMENT_REFUNDED':
    case 'PAYMENT_CHARGEBACK_REQUESTED':
      return 'REFUNDED';
    case 'PAYMENT_DELETED':
      return 'CANCELED';
    case 'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED':
      // Cartão recusado na captura (fim de linha do dunning nativo). Trata como falha
      // pra suspender o consumo de crédito e avisar o cliente ("atualize o cartão").
      return 'FAILED';
    default:
      return 'PENDING';
  }
}
