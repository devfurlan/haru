import Link from 'next/link';

import {
  alertLevel,
  getAddonUsageStatus,
  getUsageStatus,
  isOverLimit,
  type TenantWithSubscription,
  type UsageMetric,
} from '@haru/billing';

/**
 * Linha de alerta da cota de LEMBRETES por WhatsApp (plano base): um aviso a partir de 80% e,
 * a partir de 100%, avisa que só o canal WhatsApp pausou - e-mail e push seguem ilimitados e o
 * cliente final continua agendando. null se abaixo de 80% ou cota ilimitada.
 */
function reminderLine(m: UsageMetric): string | null {
  if (m.limit === null || m.pct === null || m.pct < 80) return null;
  if (m.used >= m.limit) {
    return (
      `Você usou os ${m.limit} lembretes por WhatsApp deste ciclo. A partir de agora os lembretes ` +
      `vão só por e-mail e push (ilimitados) - o WhatsApp volta na renovação e seus clientes ` +
      `continuam agendando normalmente.`
    );
  }
  return `Você já usou ${m.pct}% dos lembretes por WhatsApp do seu plano (${m.used}/${m.limit} neste ciclo).`;
}

/** Linha de alerta das conversas do bot (addon): a partir de 85%. null caso contrário. */
function addonLine(m: UsageMetric): string | null {
  if (m.limit === null || alertLevel(m.pct) < 85) return null;
  if (m.used >= m.limit) {
    return `Você atingiu o limite de conversas do bot do seu plano (${m.used}/${m.limit} neste ciclo).`;
  }
  return `Você já usou ${m.pct}% das conversas do bot do seu plano (${m.used}/${m.limit} neste ciclo).`;
}

/**
 * Banner de uso no topo do dashboard. Aparece quando os lembretes por WhatsApp (plano base)
 * passam de 80% da cota do ciclo, ou as conversas do bot (addon) passam de 85%. Agendamento é
 * ILIMITADO e nunca bloqueia; ao esgotar a cota de lembretes só o canal WhatsApp pausa até a
 * renovação - e-mail e push seguem e os clientes continuam agendando.
 */
export async function UsageBanner({ tenant }: { tenant: TenantWithSubscription }) {
  const [usage, addon] = await Promise.all([getUsageStatus(tenant), getAddonUsageStatus(tenant)]);

  const lines = [reminderLine(usage.whatsappReminders), addonLine(addon)].filter(
    (l): l is string => l !== null,
  );

  if (lines.length === 0) return null;

  const exceeded = isOverLimit(usage.whatsappReminders) || isOverLimit(addon);

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
          href="/assinatura"
          className="bg-foreground text-background shrink-0 rounded-md px-3 py-1.5 text-xs font-medium hover:opacity-90"
        >
          Fazer upgrade
        </Link>
      </div>
    </div>
  );
}
