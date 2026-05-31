import type { PaymentProvider } from '@haru/database';

import { decryptSecret } from './crypto';

import { AsaasGateway } from './asaas';
import { MercadoPagoGateway } from './mercadopago';
import { PagarmeGateway } from './pagarme';
import { PagBankGateway } from './pagbank';
import { type PaymentGateway, PaymentConfigError } from './types';

/** Subconjunto do Tenant necessário pra resolver e configurar o gateway. */
export interface TenantPaymentConfig {
  paymentProvider: PaymentProvider | null;
  paymentSandbox: boolean;
  paymentAsaasApiKeyEnc: string | null;
  paymentMercadoPagoTokenEnc: string | null;
  paymentPagBankTokenEnc: string | null;
  paymentPagarmeApiKeyEnc: string | null;
  paymentWebhookTokenEnc: string | null;
}

/** Credencial criptografada do provider ativo (ou null se não configurada). */
function credentialFor(tenant: TenantPaymentConfig, provider: PaymentProvider): string | null {
  switch (provider) {
    case 'ASAAS':
      return tenant.paymentAsaasApiKeyEnc;
    case 'MERCADO_PAGO':
      return tenant.paymentMercadoPagoTokenEnc;
    case 'PAGBANK':
      return tenant.paymentPagBankTokenEnc;
    case 'PAGARME':
      return tenant.paymentPagarmeApiKeyEnc;
  }
}

/**
 * Resolve o adapter de pagamento do tenant: descriptografa a credencial e instancia
 * o gateway correspondente. Lança `PaymentConfigError` se não houver provider/credencial
 * configurados (capturado pela action e pelo webhook, que respondem amigável).
 */
export function getGatewayForTenant(tenant: TenantPaymentConfig): PaymentGateway {
  const provider = tenant.paymentProvider;
  if (!provider) {
    throw new PaymentConfigError('Pagamento não configurado para este estabelecimento');
  }

  const credEnc = credentialFor(tenant, provider);
  if (!credEnc) {
    throw new PaymentConfigError('Credencial do gateway de pagamento ausente');
  }
  const apiKey = decryptSecret(credEnc);
  const sandbox = tenant.paymentSandbox;

  switch (provider) {
    case 'ASAAS':
      return new AsaasGateway({ apiKey, sandbox });
    case 'MERCADO_PAGO':
      return new MercadoPagoGateway({ apiKey, sandbox });
    case 'PAGBANK':
      return new PagBankGateway({ apiKey, sandbox });
    case 'PAGARME':
      return new PagarmeGateway({ apiKey, sandbox });
  }
}

/** Token de webhook do tenant em texto puro (ou null). Usado pra validar o callback. */
export function webhookTokenForTenant(tenant: TenantPaymentConfig): string | null {
  return tenant.paymentWebhookTokenEnc ? decryptSecret(tenant.paymentWebhookTokenEnc) : null;
}
