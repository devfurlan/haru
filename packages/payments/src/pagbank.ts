import {
  type CreateChargeInput,
  type CreateChargeResult,
  type ParsedWebhook,
  type ParseWebhookArgs,
  type PaymentGateway,
  GatewayNotImplementedError,
} from './types.js';

/**
 * Stub do PagSeguro/PagBank — estrutura/UI prontas, cobrança ainda não implementada.
 * Quando for implementar, espelhar o `AsaasGateway`.
 */
export class PagBankGateway implements PaymentGateway {
  readonly provider = 'PAGBANK' as const;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_config: { apiKey: string; sandbox: boolean }) {}

  createCharge(_input: CreateChargeInput): Promise<CreateChargeResult> {
    throw new GatewayNotImplementedError('PagBank');
  }

  parseWebhook(_args: ParseWebhookArgs): ParsedWebhook {
    throw new GatewayNotImplementedError('PagBank');
  }
}
