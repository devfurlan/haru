import {
  type CreateChargeInput,
  type CreateChargeResult,
  type ParsedWebhook,
  type ParseWebhookArgs,
  type PaymentGateway,
  GatewayNotImplementedError,
} from './types';

/**
 * Stub do Pagar.me — estrutura/UI prontas, cobrança ainda não implementada.
 * Quando for implementar, espelhar o `AsaasGateway`.
 */
export class PagarmeGateway implements PaymentGateway {
  readonly provider = 'PAGARME' as const;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_config: { apiKey: string; sandbox: boolean }) {}

  createCharge(_input: CreateChargeInput): Promise<CreateChargeResult> {
    throw new GatewayNotImplementedError('Pagar.me');
  }

  parseWebhook(_args: ParseWebhookArgs): ParsedWebhook {
    throw new GatewayNotImplementedError('Pagar.me');
  }
}
