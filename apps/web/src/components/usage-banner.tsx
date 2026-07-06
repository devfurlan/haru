import Link from 'next/link';

import {
  alertLevel,
  getAddonUsageStatus,
  getUsageStatus,
  isFairUse,
  isOverLimit,
  isSubscriptionActive,
  type TenantWithSubscription,
  type UsageMetric,
} from '@haru/billing';

/** Frase de alerta para uma métrica, ou null se abaixo de 85% / ilimitada. */
function alertLine(label: string, m: UsageMetric): string | null {
  const level = alertLevel(m.pct);
  if (level < 85 || m.limit === null) return null;
  // "Atingiu" só no over-limit REAL (used >= limit), não no pct arredondado
  // (249/250 arredonda p/ 100% mas ainda não estourou).
  if (m.used >= m.limit) {
    return `Você atingiu o limite de ${label} do seu plano (${m.used}/${m.limit} neste ciclo).`;
  }
  return `Você já usou ${m.pct}% dos ${label} do seu plano (${m.used}/${m.limit} neste ciclo).`;
}

/**
 * Banner de uso no topo do dashboard. Aparece só quando agendamentos (plano base) ou
 * conversas do bot (addon) passam de 85% do teto do ciclo. Soft cap: o cliente final
 * continua agendando normalmente - ao estourar o teto de agendamentos só as CRIAÇÕES
 * do dono ficam pausadas (ver guards owner-side). Fair use nunca é bloqueado.
 */
export async function UsageBanner({ tenant }: { tenant: TenantWithSubscription }) {
  const [usage, addon] = await Promise.all([getUsageStatus(tenant), getAddonUsageStatus(tenant)]);

  const lines = [
    alertLine('agendamentos', usage.appointments),
    alertLine('conversas do bot', addon),
  ].filter((l): l is string => l !== null);

  if (lines.length === 0) return null;

  const apptExceeded = isOverLimit(usage.appointments);
  const exceeded = apptExceeded || isOverLimit(addon);
  // Espelha exatamente isAppointmentLimitReached (assinatura ativa + over + não fair use):
  // não afirma "criações pausadas" quando o guard owner-side de fato não bloqueia.
  const creationsBlocked =
    apptExceeded && isSubscriptionActive(tenant.subscription) && !isFairUse(tenant.subscription);

  return (
    <div
      role="status"
      className={
        exceeded
          ? 'border-b border-red-200 bg-red-50 px-6 py-3 text-sm text-red-800'
          : 'border-b border-amber-200 bg-amber-50 px-6 py-3 text-sm text-amber-900'
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-0.5">
          {lines.map((l) => (
            <p key={l}>{l}</p>
          ))}
          {creationsBlocked && (
            <p className="font-medium">
              A criação de novos serviços, profissionais e agendamentos manuais ficou pausada até o
              upgrade - seus clientes continuam agendando normalmente.
            </p>
          )}
        </div>
        <Link
          href="/assinatura"
          className="bg-foreground text-background shrink-0 rounded-md px-3 py-1.5 text-xs font-medium hover:opacity-90"
        >
          Fazer upgrade
        </Link>
      </div>
    </div>
  );
}
