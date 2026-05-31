import {
  type CreateChargeInput,
  type CreateChargeResult,
  type ParsedWebhook,
  type ParseWebhookArgs,
  type PaymentGateway,
  GatewayNotImplementedError,
} from './types';

/**
 * Stub do Mercado Pago — estrutura/UI prontas, mas a cobrança ainda não está
 * implementada. Quando for implementar, espelhar o `AsaasGateway`.
 */
export class MercadoPagoGateway implements PaymentGateway {
  readonly provider = 'MERCADO_PAGO' as const;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_config: { apiKey: string; sandbox: boolean }) {}

  createCharge(_input: CreateChargeInput): Promise<CreateChargeResult> {
    throw new GatewayNotImplementedError('Mercado Pago');
  }

  parseWebhook(_args: ParseWebhookArgs): ParsedWebhook {
    throw new GatewayNotImplementedError('Mercado Pago');
  }
}
