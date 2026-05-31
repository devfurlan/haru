import { timingSafeEqual } from 'node:crypto';

import {
  type CreateChargeInput,
  type CreateChargeResult,
  type ParsedWebhook,
  type ParseWebhookArgs,
  type PaymentGateway,
  PaymentConfigError,
} from './types.js';

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

/** E.164 ("5511914092346") → número nacional ("11914092346") pro Asaas. */
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
        mobilePhone: toNationalPhone(input.customer.phoneE164),
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

  parseWebhook({ rawBody, headers, webhookToken }: ParseWebhookArgs): ParsedWebhook {
    // Autenticidade: header `asaas-access-token` deve bater com o token do tenant.
    if (webhookToken) {
      const received = headers.get('asaas-access-token') ?? '';
      const a = Buffer.from(received);
      const b = Buffer.from(webhookToken);
      if (a.length !== b.length || !timingSafeEqual(a, b)) {
        throw new PaymentConfigError('Token do webhook Asaas inválido');
      }
    }

    let body: { event?: string; payment?: { id?: string; paymentDate?: string | null } };
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

    return { externalId, status, paidAt };
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
    default:
      return 'PENDING';
  }
}
