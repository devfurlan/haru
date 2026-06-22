import type { PaymentProvider } from '@haru/database';

/**
 * Contrato comum dos gateways de pagamento. Cada provider implementa esta interface;
 * a `factory` resolve o adapter certo a partir do tenant. Só o Asaas é real hoje -
 * os demais são stubs que lançam `GatewayNotImplementedError`.
 */

/** Meio de cobrança pedido ao gateway. UNDEFINED = checkout deixa o cliente escolher. */
export type ChargeMethod = 'PIX' | 'CREDIT_CARD' | 'UNDEFINED';

export interface CreateChargeInput {
  amountCents: number;
  /** Descrição curta exibida ao cliente (ex.: "Corte de cabelo · 02/06 14:00"). */
  description: string;
  method: ChargeMethod;
  /** Nosso `Payment.id` - volta no webhook como externalReference pra reconciliar. */
  externalReference: string;
  /** `cpfCnpj`: só dígitos. O Asaas exige documento do pagador pra emitir Pix. */
  customer: { name: string; phoneE164: string; email?: string | null; cpfCnpj?: string | null };
  /** Vencimento da cobrança. Default do adapter: hoje + 1 dia. */
  dueDate?: Date;
}

export interface CreateChargeResult {
  /** ID da cobrança no gateway. */
  externalId: string;
  /** URL do checkout/fatura hospedada (cartão e fallback). */
  checkoutUrl: string | null;
  /** Pix: imagem do QR como data URI base64. */
  pixQrCode: string | null;
  /** Pix: copia-e-cola (payload EMV). */
  pixCopyPaste: string | null;
  status: 'PENDING' | 'PAID' | 'FAILED';
  expiresAt: Date | null;
}

export interface ParsedWebhook {
  /** ID da cobrança no gateway (= nosso `Payment.externalId`). */
  externalId: string;
  status: 'PAID' | 'FAILED' | 'EXPIRED' | 'REFUNDED' | 'CANCELED' | 'PENDING';
  paidAt: Date | null;
}

export interface ParseWebhookArgs {
  rawBody: Buffer;
  headers: Headers;
  /** Token configurado pelo tenant pra validar a autenticidade do webhook. */
  webhookToken: string | null;
}

export interface PaymentGateway {
  readonly provider: PaymentProvider;
  createCharge(input: CreateChargeInput): Promise<CreateChargeResult>;
  /** Valida autenticidade do webhook e extrai o resultado da cobrança. */
  parseWebhook(args: ParseWebhookArgs): ParsedWebhook;
}

/** Lançado pelos adapters stub e pela factory quando o gateway não tem implementação. */
export class GatewayNotImplementedError extends Error {
  constructor(provider: string) {
    super(`O gateway ${provider} ainda não está disponível. Use o Asaas por enquanto.`);
    this.name = 'GatewayNotImplementedError';
  }
}

/** Erro de configuração (provider/credencial ausente, webhook não autêntico, etc.). */
export class PaymentConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaymentConfigError';
  }
}
