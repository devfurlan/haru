import 'server-only';

// Relatório de comissões do dono: quanto cada profissional gerou (do MOTOR) e, pelo modelo de
// remuneração dele, quanto tem a receber (ou a pagar, no aluguel de cadeira). O faturamento vem
// SEMPRE do motor (getRevenueByProfessional); a comissão é a camada de cima (commission-core).

import { prisma } from '@haru/database';

import {
  computeCommission,
  summarizeCommissions,
  type CommissionResult,
  type CompensationConfig,
  type CommissionTotals,
} from '@/lib/commission-core';
import { dashboardWindows } from '@/lib/dashboard-core';
import { getRevenueByProfessional } from '@/lib/metrics/metrics';
import { isoDateInTz } from '@haru/shared';

export type CommissionPeriodKey = 'month' | 'week' | 'lastMonth';

export interface CommissionRow extends CommissionResult {
  professionalId: string;
  professionalName: string | null;
  /** Config crua pra pré-preencher o editor (null = não configurado). */
  config: CompensationConfig | null;
}

export interface CommissionReport {
  period: CommissionPeriodKey;
  from: Date;
  to: Date;
  /** Rótulo do período no fuso do tenant, ex. "julho de 2026" / "01/07 a 17/07". */
  label: string;
  rows: CommissionRow[]; // todos os profissionais, ordenados por bruto gerado desc
  totals: CommissionTotals;
}

const monthLabel = (d: Date, tz: string) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: tz, month: 'long', year: 'numeric' }).format(d);

/** Janela [from, to) do período, no fuso do tenant, + rótulo. */
function periodWindow(
  period: CommissionPeriodKey,
  now: Date,
  tz: string,
): { from: Date; to: Date; label: string } {
  const w = dashboardWindows(now, tz);
  if (period === 'week') {
    const label = `${isoDateInTz(w.weekStart, tz).slice(8)}/${isoDateInTz(w.weekStart, tz).slice(5, 7)} até agora`;
    return { from: w.weekStart, to: now, label: `semana (${label})` };
  }
  if (period === 'lastMonth') {
    // Mês anterior COMPLETO (o "fecha o mês" de verdade).
    return { from: w.prevMonthStart, to: w.monthStart, label: monthLabel(w.prevMonthStart, tz) };
  }
  // month (padrão): mês corrente até agora.
  return { from: w.monthStart, to: now, label: `${monthLabel(w.monthStart, tz)} (até agora)` };
}

function toConfig(
  c: {
    model: CompensationConfig['model'];
    commissionPercent: number | null;
    fixedPerServiceCents: number | null;
    chairRentCents: number | null;
  } | null,
): CompensationConfig | null {
  if (!c) return null;
  return {
    model: c.model,
    commissionPercent: c.commissionPercent,
    fixedPerServiceCents: c.fixedPerServiceCents,
    chairRentCents: c.chairRentCents,
  };
}

/** Relatório de comissões do período pro fechamento. Todos os pros, mesmo com 0 gerado. */
export async function getCommissionReport(
  tenant: { id: string; timezone: string },
  period: CommissionPeriodKey,
  now = new Date(),
): Promise<CommissionReport> {
  const { from, to, label } = periodWindow(period, now, tenant.timezone);

  const [pros, byPro] = await Promise.all([
    prisma.user.findMany({
      where: { tenantId: tenant.id, isProfessional: true },
      select: {
        id: true,
        name: true,
        compensation: {
          select: {
            model: true,
            commissionPercent: true,
            fixedPerServiceCents: true,
            chairRentCents: true,
          },
        },
      },
      orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
    }),
    getRevenueByProfessional({ scope: { tenantId: tenant.id }, from, to, now }),
  ]);

  const rows: CommissionRow[] = pros
    .map((p) => {
      const m = byPro.get(p.id) ?? { revenueCents: 0, count: 0 };
      const config = toConfig(p.compensation);
      const result = computeCommission(config, m.revenueCents, m.count);
      return { professionalId: p.id, professionalName: p.name, config, ...result };
    })
    .sort((a, b) => b.revenueCents - a.revenueCents);

  return { period, from, to, label, rows, totals: summarizeCommissions(rows) };
}
