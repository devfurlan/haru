import { prisma } from '@haru/database';

export const PERIODS = [7, 30, 90] as const;
export type Period = (typeof PERIODS)[number];

export function parsePeriod(raw: string | undefined): Period {
  const n = Number(raw);
  return (PERIODS as readonly number[]).includes(n) ? (n as Period) : 30;
}

export interface TenantUsage {
  tenantId: string;
  tenantName: string;
  slug: string;
  requests: number;
  totalTokens: number;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  costUsd: number;
  cacheHit: number; // fração 0..1 sobre o input
}

export interface UsageReport {
  periodDays: Period;
  rows: TenantUsage[];
  totals: {
    requests: number;
    totalTokens: number;
    costUsd: number;
    cacheHit: number;
  };
}

/**
 * Consumo de IA agregado por tenant no período. Junta o `groupBy` de
 * AiUsageLog com o nome do tenant (groupBy não traz relação) e calcula os
 * totais e a taxa de cache.
 */
export async function getUsageByTenant(periodDays: Period): Promise<UsageReport> {
  const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

  const grouped = await prisma.aiUsageLog.groupBy({
    by: ['tenantId'],
    where: { createdAt: { gte: since } },
    _sum: {
      costUsd: true,
      totalTokens: true,
      inputTokens: true,
      cachedInputTokens: true,
      outputTokens: true,
      requests: true,
    },
  });

  const tenants = await prisma.tenant.findMany({
    where: { id: { in: grouped.map((g) => g.tenantId) } },
    select: { id: true, name: true, slug: true },
  });
  const tenantById = new Map(tenants.map((t) => [t.id, t]));

  const rows: TenantUsage[] = grouped.map((g) => {
    const t = tenantById.get(g.tenantId);
    const inputTokens = g._sum.inputTokens ?? 0;
    const cachedInputTokens = g._sum.cachedInputTokens ?? 0;
    return {
      tenantId: g.tenantId,
      tenantName: t?.name ?? '(tenant removido)',
      slug: t?.slug ?? '',
      requests: g._sum.requests ?? 0,
      totalTokens: g._sum.totalTokens ?? 0,
      inputTokens,
      cachedInputTokens,
      outputTokens: g._sum.outputTokens ?? 0,
      costUsd: Number(g._sum.costUsd ?? 0),
      cacheHit: inputTokens > 0 ? cachedInputTokens / inputTokens : 0,
    };
  });

  rows.sort((a, b) => b.costUsd - a.costUsd);

  const totalInput = rows.reduce((s, r) => s + r.inputTokens, 0);
  const totalCached = rows.reduce((s, r) => s + r.cachedInputTokens, 0);
  const totals = {
    requests: rows.reduce((s, r) => s + r.requests, 0),
    totalTokens: rows.reduce((s, r) => s + r.totalTokens, 0),
    costUsd: rows.reduce((s, r) => s + r.costUsd, 0),
    cacheHit: totalInput > 0 ? totalCached / totalInput : 0,
  };

  return { periodDays, rows, totals };
}
