import Link from 'next/link';

import type { TenantWithSubscription } from '@haru/billing';

/**
 * Aviso de billing no topo do dashboard quando a assinatura NÃO está ativa. Sem
 * carência: PAST_DUE/SUSPENDED/PENDING bloqueiam o uso, então o dono vê este aviso
 * ao entrar no painel, com CTA para regularizar.
 */
export function BillingBanner({ tenant }: { tenant: TenantWithSubscription }) {
  const status = tenant.subscription?.status ?? null;
  if (status === 'ACTIVE') return null;

  let message: string;
  let danger = true;
  switch (status) {
    case 'PAST_DUE':
      message = 'Seu pagamento não foi confirmado e o acesso está bloqueado. Regularize para reativar.';
      break;
    case 'SUSPENDED':
    case 'CANCELED':
      message = 'Sua assinatura está inativa. Reative para voltar a usar o Demandaê.';
      break;
    case 'PENDING':
      message = 'Estamos aguardando a confirmação do seu pagamento para ativar a assinatura.';
      danger = false;
      break;
    default:
      message = 'Ative uma assinatura para liberar o Demandaê.';
      danger = false;
  }

  return (
    <div
      role="alert"
      className={
        danger
          ? 'border-b border-red-200 bg-red-50 px-6 py-3 text-sm text-red-800'
          : 'border-b border-amber-200 bg-amber-50 px-6 py-3 text-sm text-amber-900'
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p>{message}</p>
        <Link
          href="/assinatura"
          className="bg-foreground text-background shrink-0 rounded-md px-3 py-1.5 text-xs font-medium hover:opacity-90"
        >
          {status === 'PENDING' ? 'Ver assinatura' : 'Regularizar'}
        </Link>
      </div>
    </div>
  );
}
