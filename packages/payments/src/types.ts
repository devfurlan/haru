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
  customer: {
    name: string;
    /** Opcional: cliente logado pode não ter WhatsApp cadastrado. */
    phoneE164?: string | null;
    email?: string | null;
    cpfCnpj?: string | null;
  };
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

  // --- Recorrência (assinatura de serviços) --------------------------------
  // Preenchidos quando o evento é de uma cobrança RECORRENTE (o gateway inclui o id
  // da assinatura na cobrança). null em cobrança avulsa - o webhook avulso ignora estes
  // campos. A rota usa `subscriptionExternalId` pra rotear pro engine de assinatura.
  /** id da assinatura no gateway (Asaas `payment.subscription`). null = cobrança avulsa. */
  subscriptionExternalId?: string | null;
  /** Nome bruto do evento do gateway (ex.: "PAYMENT_RECEIVED") - pro ledger/decisão. */
  event?: string | null;
  /** externalReference que enviamos ao criar (ex.: nosso `Membership.id`). */
  externalReference?: string | null;
  /** Valor da cobrança em centavos (snapshot do recibo do ciclo). */
  amountCents?: number | null;
  /** Últimos 4 + bandeira do cartão tokenizado (pra exibir "•••• 4242"). */
  cardLast4?: string | null;
  cardBrand?: string | null;
  /** Vencimento da cobrança (define a janela do ciclo). */
  dueDate?: Date | null;
}

/** Cliente pagador enviado ao gateway (o gateway cria/reusa um customer). */
export interface SubscriptionCustomer {
  name: string;
  /** Só dígitos. O Asaas exige documento do pagador pra assinatura recorrente. */
  cpfCnpj: string;
  email?: string | null;
  phoneE164?: string | null;
}

export interface CreateSubscriptionInput {
  /** Valor do ciclo em centavos (mensal). */
  amountCents: number;
  /** Descrição exibida ao cliente (ex.: "Clube do Corte - Barbearia do Téo"). */
  description: string;
  /** Nosso `Membership.id` - volta no webhook (externalReference) pra reconciliar. */
  externalReference: string;
  method: 'CREDIT_CARD' | 'PIX';
  /** Ciclo da recorrência. v1: só mensal. */
  cycle?: 'MONTHLY';
  customer: SubscriptionCustomer;
  /**
   * Data da 1ª cobrança. Default hoje. Na REATIVAÇÃO, passar o fim do período já pago
   * pra 1ª cobrança cair só na renovação (senão cobra em dobro um ciclo já pago).
   */
  firstDueDate?: Date;
}

export interface CreateSubscriptionResult {
  /** id da assinatura no gateway (guardamos em `Membership.gatewaySubscriptionId`). */
  externalSubscriptionId: string;
  /** id do customer no gateway (reusado entre renovações). */
  gatewayCustomerId: string;
  /** Status do gateway na criação (a confirmação do 1º pagamento vem por webhook). */
  status: string;
  /** 1ª cobrança pra prosseguir o checkout. Cartão é digitado na `checkoutUrl` hospedada. */
  firstCharge: {
    externalId: string;
    checkoutUrl: string | null;
    pixQrCode: string | null;
    pixCopyPaste: string | null;
  } | null;
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
  /**
   * Cria uma assinatura RECORRENTE (cobrança mensal automática) na conta do tenant.
   * Cartão: o cliente digita na fatura hospedada (`firstCharge.checkoutUrl`) e o gateway
   * tokeniza + recobra sozinho nos ciclos seguintes (dunning/retry nativos do gateway).
   */
  createSubscription(input: CreateSubscriptionInput): Promise<CreateSubscriptionResult>;
  /** Cancela a assinatura no gateway (para as cobranças futuras). */
  cancelSubscription(externalSubscriptionId: string): Promise<void>;
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
