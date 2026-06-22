import Link from 'next/link';

import { alertLevel, getUsageStatus, type TenantWithSubscription, type UsageMetric } from '@haru/billing';

/** Frase de alerta para uma métrica, ou null se abaixo de 85% / ilimitada. */
function alertLine(label: string, m: UsageMetric): string | null {
  const level = alertLevel(m.pct);
  if (level < 85 || m.limit === null) return null;
  if (level >= 100) {
    return `Você ultrapassou o limite de ${label} do seu plano (${m.used}/${m.limit} neste mês).`;
  }
  return `Você já usou ${m.pct}% dos ${label} do seu plano (${m.used}/${m.limit} neste mês).`;
}

/**
 * Banner de uso no topo do dashboard. Aparece só quando agendamentos ou mensagens
 * de IA passam de 85% do limite do plano (e quando excedido). Soft cap: o serviço
 * continua funcionando - o banner só pressiona o upgrade.
 */
export async function UsageBanner({ tenant }: { tenant: TenantWithSubscription }) {
  const usage = await getUsageStatus(tenant);

  const lines = [
    alertLine('agendamentos', usage.appointments),
    alertLine('mensagens de IA', usage.aiMessages),
  ].filter((l): l is string => l !== null);

  if (lines.length === 0) return null;

  const exceeded =
    alertLevel(usage.appointments.pct) >= 100 || alertLevel(usage.aiMessages.pct) >= 100;

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
        </div>
        <Link
          href="/settings#plano"
          className="bg-foreground text-background shrink-0 rounded-md px-3 py-1.5 text-xs font-medium hover:opacity-90"
        >
          Fazer upgrade
        </Link>
      </div>
    </div>
  );
}
