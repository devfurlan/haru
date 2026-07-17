import 'server-only';

// Dados do DASHBOARD do dono (o "agora" do negócio). Orquestra o MOTOR de métricas: decide as
// janelas (hoje / semana / mês, no fuso do tenant) e compara "no mesmo ponto". ZERO cálculo de
// faturamento/atendimento próprio - todo número vem de getMetrics/getRevenue. Só monta o DTO,
// os deltas (aritmética sobre saídas do motor) e os destaques.

import { prisma } from '@haru/database';

import { dashboardWindows, pickHighlights, trend, type Trend } from '@/lib/dashboard-core';
import { getMetrics, getRevenue } from '@/lib/metrics/metrics';

export interface DashboardData {
  today: {
    revenueCents: number;
    /** Mesmo horário da semana passada (ritmo). */
    prevRevenueCents: number;
    trend: Trend;
    total: number;
    realized: number;
    upcoming: number;
    noShow: number;
    occupancyPct: number;
  };
  week: { revenueCents: number; trend: Trend };
  month: { revenueCents: number; trend: Trend };
  /** Assinaturas (Clube) - null quando não há assinante ativo. */
  mrr: { cents: number; activeCount: number } | null;
  /** Clientes na fila esperando vaga - null quando o tenant não usa fila. */
  waiting: number | null;
  highlights: string[];
}

export async function getDashboard(
  tenant: { id: string; timezone: string; waitlistEnabled: boolean },
  now = new Date(),
): Promise<DashboardData> {
  const tz = tenant.timezone;
  const w = dashboardWindows(now, tz);
  const scope = { tenantId: tenant.id };

  // 1 chamada completa (hoje) + 5 enxutas (comparações, só faturamento) + contagem da fila.
  const [today, todayPrev, weekCur, weekPrev, monthCur, monthPrev, waiting] = await Promise.all([
    getMetrics({ scope, from: w.todayStart, to: w.todayEnd, now }),
    getRevenue({ scope, from: w.lastWeekDayStart, to: w.lastWeekPoint, now: w.lastWeekPoint }),
    getRevenue({ scope, from: w.weekStart, to: now, now }),
    getRevenue({ scope, from: w.prevWeekStart, to: w.prevWeekPoint, now: w.prevWeekPoint }),
    getRevenue({ scope, from: w.monthStart, to: now, now }),
    getRevenue({ scope, from: w.prevMonthStart, to: w.prevMonthPoint, now: w.prevMonthPoint }),
    tenant.waitlistEnabled
      ? prisma.waitlistEntry.count({ where: { tenantId: tenant.id, status: 'WAITING' } })
      : Promise.resolve(null),
  ]);

  const occupancyPct = Math.round(today.occupancy.occupancy * 100);
  const weekdayLabel = new Intl.DateTimeFormat('pt-BR', { timeZone: tz, weekday: 'long' })
    .format(now)
    .replace('-feira', '');

  const highlights = pickHighlights({
    weekdayLabel,
    todayRevenueCents: today.revenueCents,
    todayPrevRevenueCents: todayPrev,
    upcoming: today.upcoming,
    noShow: today.noShow,
    occupancyPct,
  });

  return {
    today: {
      revenueCents: today.revenueCents,
      prevRevenueCents: todayPrev,
      trend: trend(today.revenueCents, todayPrev),
      total: today.total,
      realized: today.realized,
      upcoming: today.upcoming,
      noShow: today.noShow,
      occupancyPct,
    },
    week: { revenueCents: weekCur, trend: trend(weekCur, weekPrev) },
    month: { revenueCents: monthCur, trend: trend(monthCur, monthPrev) },
    mrr: today.mrr.activeCount > 0 ? today.mrr : null,
    waiting: waiting && waiting > 0 ? waiting : null,
    highlights,
  };
}
