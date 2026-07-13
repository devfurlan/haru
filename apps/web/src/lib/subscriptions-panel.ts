import 'server-only';

import { prisma } from '@haru/database';

/**
 * Métricas da assinatura de serviços POR ESTABELECIMENTO, pro painel do dono. Tudo computado
 * on-the-fly (sem tabela de rollup) - a base por tenant é pequena (dezenas/centenas), query
 * indexada barata; materializar exigiria invalidar em todo assinar/cancelar/renovar. As telas
 * da próxima sessão consomem daqui. Segue o padrão de waitlist-panel.ts (server-only, só lê).
 */

export interface SubscriptionMetrics {
  /** Receita recorrente mensal do dono = soma das assinaturas que dão acesso. */
  mrrCents: number;
  activeCount: number;
  /** Receita média por assinante (MRR / assinantes). */
  arpuCents: number;
  byPlan: Array<{ planId: string; name: string; activeCount: number; mrrCents: number }>;
  /** Taxa de uso de crédito no mês civil: usados vs distribuídos. */
  creditUsage: { used: number; distributed: number; pct: number | null };
}

function monthRange(now: Date): { gte: Date; lt: Date } {
  const gte = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const lt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { gte, lt };
}

export async function getSubscriptionMetrics(
  tenantId: string,
  now = new Date(),
): Promise<SubscriptionMetrics> {
  // Contam pra MRR as que dão acesso: ACTIVE, ou CANCELED ainda dentro do período pago
  // (mesma regra do consumo - churning só sai do MRR quando o período pago acaba).
  const active = await prisma.membership.findMany({
    where: {
      tenantId,
      OR: [{ status: 'ACTIVE' }, { status: 'CANCELED', currentPeriodEnd: { gt: now } }],
    },
    select: { priceCents: true, planId: true, planName: true },
  });
  const mrrCents = active.reduce((s, m) => s + m.priceCents, 0);
  const activeCount = active.length;
  const arpuCents = activeCount > 0 ? Math.round(mrrCents / activeCount) : 0;

  const byPlanMap = new Map<string, SubscriptionMetrics['byPlan'][number]>();
  for (const m of active) {
    const cur =
      byPlanMap.get(m.planId) ??
      { planId: m.planId, name: m.planName, activeCount: 0, mrrCents: 0 };
    cur.activeCount++;
    cur.mrrCents += m.priceCents;
    byPlanMap.set(m.planId, cur);
  }
  const byPlan = [...byPlanMap.values()].sort((a, b) => b.mrrCents - a.mrrCents);

  // Uso de crédito no mês civil: distribuídos (CYCLE_GRANT) vs usados (REDEEM), via ledger.
  const { gte, lt } = monthRange(now);
  const [granted, redeemed] = await Promise.all([
    prisma.membershipCreditLedger.aggregate({
      where: { membership: { tenantId }, reason: 'CYCLE_GRANT', createdAt: { gte, lt } },
      _sum: { delta: true },
    }),
    prisma.membershipCreditLedger.aggregate({
      where: { membership: { tenantId }, reason: 'REDEEM', createdAt: { gte, lt } },
      _sum: { delta: true },
    }),
  ]);
  const distributed = granted._sum.delta ?? 0;
  const used = -(redeemed._sum.delta ?? 0); // REDEEM tem delta negativo
  const pct = distributed > 0 ? Math.round((used / distributed) * 100) : null;

  return { mrrCents, activeCount, arpuCents, byPlan, creditUsage: { used, distributed, pct } };
}

// ─────────────────────────────────────────────────────────────────────────────
// Overview completo pro painel (planos, assinantes agrupados por plano, tendência
// e comparativo de receita). Tudo derivado das MESMAS tabelas que a engine grava
// (Membership, MembershipCharge, MembershipCreditLedger) - zero mock, zero rollup.
// Formatação (moeda/data) feita aqui pra o painel client não precisar de formatter.
// ─────────────────────────────────────────────────────────────────────────────

const BRL0 = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});
const BRL2 = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
});
const brl0 = (cents: number) => BRL0.format(cents / 100);
const brl2 = (cents: number) => BRL2.format(cents / 100);

// prettier-ignore
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
// prettier-ignore
const MONTHS_ABBR = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Aguardando',
  PAID: 'Pago',
  FAILED: 'Falhou',
  CANCELED: 'Cancelado',
  EXPIRED: 'Vencido',
  REFUNDED: 'Estornado',
};

function initials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  const a = parts[0][0] ?? '';
  const b = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
  return (a + b).toUpperCase() || '?';
}

function firstName(name: string | null | undefined): string {
  return (name ?? '').trim() || 'Cliente';
}

/** "Corte, Barba +2" - no máx. 2 nomes, resto vira contador. */
function labelServices(names: string[]): string {
  if (names.length === 0) return 'Nenhum serviço';
  if (names.length <= 2) return names.join(', ');
  return `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
}

export type SubscriberStatus = 'ACTIVE' | 'PAST_DUE' | 'CANCELED';

export interface PlanRow {
  id: string;
  name: string;
  active: boolean;
  priceCents: number;
  priceLabel: string;
  creditsPerCycle: number;
  creditsLabel: string;
  creditRollover: boolean;
  rolloverCap: number | null;
  rolloverLabel: string;
  servicesLabel: string;
  services: Array<{ serviceId: string; creditCost: number; name: string }>;
  activeCount: number;
  mrrCents: number;
  mrrLabel: string;
}

export interface SubscriberRow {
  membershipId: string;
  name: string;
  initials: string;
  status: SubscriberStatus;
  creditBalance: number;
  nextChargeLabel: string;
  canCancel: boolean;
}

export interface PlanGroup {
  planId: string;
  planName: string;
  priceLabel: string;
  count: number;
  countLabel: string;
  rows: SubscriberRow[];
}

export interface TrendPoint {
  monthLabel: string;
  cents: number;
  isCurrent: boolean;
}

export interface SubscriptionsOverview {
  monthLabel: string;
  metrics: {
    mrrCents: number;
    mrrLabel: string;
    activeCount: number;
    subsLabel: string;
    arpuLabel: string;
    creditPct: number | null;
    creditUsedLabel: string;
    creditUsed: number;
    creditDistributed: number;
  };
  /** Comparativo com o mês anterior. show=false quando não há mês anterior com receita. */
  delta: {
    show: boolean;
    prevMonthLabel: string;
    positive: boolean;
    mrrLabel: string;
    subsLabel: string;
  };
  /** Receita recebida mês a mês (últimos 6). show=false com menos de 2 meses com dados. */
  trend: { show: boolean; maxCents: number; points: TrendPoint[] };
  plans: PlanRow[];
  groups: PlanGroup[];
}

export async function getSubscriptionsOverview(
  tenantId: string,
  timezone: string,
  now = new Date(),
): Promise<SubscriptionsOverview> {
  const shortDate = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    timeZone: timezone,
  });

  // Janela de tendência: início do mês 5 meses atrás (6 baldes com o mês atual).
  const y = now.getUTCFullYear();
  const mo = now.getUTCMonth();
  const trendStart = new Date(Date.UTC(y, mo - 5, 1));
  const prevStart = new Date(Date.UTC(y, mo - 1, 1));
  const prevEnd = new Date(Date.UTC(y, mo, 1));

  const [metrics, plansRaw, subs, paidCharges] = await Promise.all([
    getSubscriptionMetrics(tenantId, now),
    prisma.membershipPlan.findMany({
      where: { tenantId },
      orderBy: [{ active: 'desc' }, { createdAt: 'asc' }],
      include: { services: { include: { service: { select: { id: true, name: true } } } } },
    }),
    prisma.membership.findMany({
      where: {
        tenantId,
        OR: [
          { status: { in: ['ACTIVE', 'PAST_DUE'] } },
          // Cancelada mas com crédito ainda válido: o dono ainda a vê (mesma regra do MRR).
          { status: 'CANCELED', currentPeriodEnd: { gt: now } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        creditBalance: true,
        currentPeriodEnd: true,
        planId: true,
        customerAccount: { select: { name: true } },
      },
    }),
    prisma.membershipCharge.findMany({
      where: { tenantId, paidAt: { gte: trendStart } },
      select: { amountCents: true, paidAt: true, membershipId: true },
    }),
  ]);

  // ── Planos ──
  const byPlan = new Map(metrics.byPlan.map((b) => [b.planId, b]));
  const plans: PlanRow[] = plansRaw.map((p) => {
    const bp = byPlan.get(p.id);
    return {
      id: p.id,
      name: p.name,
      active: p.active,
      priceCents: p.priceCents,
      priceLabel: brl2(p.priceCents),
      creditsPerCycle: p.creditsPerCycle,
      creditsLabel: `${p.creditsPerCycle} ${p.creditsPerCycle === 1 ? 'crédito' : 'créditos'}/mês`,
      creditRollover: p.creditRollover,
      rolloverCap: p.rolloverCap,
      rolloverLabel: p.creditRollover
        ? p.rolloverCap
          ? `Acumula até ${p.rolloverCap}`
          : 'Acumula sem limite'
        : 'Vencem no fim do mês',
      servicesLabel: labelServices(p.services.map((s) => s.service.name)),
      services: p.services.map((s) => ({
        serviceId: s.serviceId,
        creditCost: s.creditCost,
        name: s.service.name,
      })),
      activeCount: bp?.activeCount ?? 0,
      mrrCents: bp?.mrrCents ?? 0,
      mrrLabel: brl0(bp?.mrrCents ?? 0),
    };
  });

  // ── Assinantes por plano (na ordem dos planos) ──
  const groupMap = new Map<string, PlanGroup>();
  for (const p of plans) {
    groupMap.set(p.id, {
      planId: p.id,
      planName: p.name,
      priceLabel: p.priceLabel,
      count: 0,
      countLabel: '',
      rows: [],
    });
  }
  for (const s of subs) {
    const g = groupMap.get(s.planId);
    if (!g) continue;
    const status = s.status as SubscriberStatus;
    const nextChargeLabel =
      status === 'CANCELED'
        ? 'Cancelada'
        : status === 'PAST_DUE'
          ? 'Em atraso'
          : s.currentPeriodEnd
            ? shortDate.format(s.currentPeriodEnd)
            : '—';
    g.rows.push({
      membershipId: s.id,
      name: firstName(s.customerAccount.name),
      initials: initials(s.customerAccount.name),
      status,
      creditBalance: s.creditBalance,
      nextChargeLabel,
      canCancel: status === 'ACTIVE' || status === 'PAST_DUE',
    });
  }
  const groups = [...groupMap.values()]
    .filter((g) => g.rows.length > 0)
    .map((g) => ({
      ...g,
      count: g.rows.length,
      countLabel: `${g.rows.length} ${g.rows.length === 1 ? 'assinante' : 'assinantes'}`,
    }));

  // ── Tendência (receita recebida por mês) + comparativo ──
  const buckets = new Array(6).fill(0);
  const prevPayers = new Set<string>();
  let prevRealized = 0;
  for (const c of paidCharges) {
    const paid = c.paidAt;
    if (!paid) continue;
    const idx = (paid.getUTCFullYear() - y) * 12 + (paid.getUTCMonth() - mo) + 5;
    if (idx >= 0 && idx < 6) buckets[idx] += c.amountCents;
    if (paid >= prevStart && paid < prevEnd) {
      prevRealized += c.amountCents;
      prevPayers.add(c.membershipId);
    }
  }
  const points: TrendPoint[] = buckets.map((cents, i) => ({
    monthLabel: MONTHS_ABBR[new Date(Date.UTC(y, mo - 5 + i, 1)).getUTCMonth()],
    cents,
    isCurrent: i === 5,
  }));
  const monthsWithData = buckets.filter((c) => c > 0).length;
  const maxCents = Math.max(1, ...buckets);

  const deltaMrr = metrics.mrrCents - prevRealized;
  const deltaSubs = metrics.activeCount - prevPayers.size;
  const sign = (n: number) => (n >= 0 ? '+' : '−');

  return {
    monthLabel: MONTHS[mo],
    metrics: {
      mrrCents: metrics.mrrCents,
      mrrLabel: brl0(metrics.mrrCents),
      activeCount: metrics.activeCount,
      subsLabel: `${metrics.activeCount} ${metrics.activeCount === 1 ? 'assinante' : 'assinantes'}`,
      arpuLabel: brl0(metrics.arpuCents),
      creditPct: metrics.creditUsage.pct,
      creditUsedLabel: metrics.creditUsage.pct != null ? `${metrics.creditUsage.pct}%` : '—',
      creditUsed: metrics.creditUsage.used,
      creditDistributed: metrics.creditUsage.distributed,
    },
    delta: {
      show: prevRealized > 0,
      prevMonthLabel: MONTHS[prevStart.getUTCMonth()],
      positive: deltaMrr >= 0,
      mrrLabel: `${sign(deltaMrr)}${brl0(Math.abs(deltaMrr))}`,
      subsLabel: `${sign(deltaSubs)}${Math.abs(deltaSubs)} ${Math.abs(deltaSubs) === 1 ? 'assinante' : 'assinantes'}`,
    },
    trend: { show: monthsWithData >= 2, maxCents, points },
    plans,
    groups,
  };
}

export interface MembershipHistoryRow {
  dateLabel: string;
  amountLabel: string;
  statusLabel: string;
  paid: boolean;
}

export interface MembershipHistory {
  name: string;
  planName: string;
  rows: MembershipHistoryRow[];
}

/** Histórico de cobranças de UMA assinatura (aba "ver histórico"). tenantId trava o acesso. */
export async function getMembershipHistory(
  tenantId: string,
  membershipId: string,
  timezone: string,
): Promise<MembershipHistory | null> {
  const membership = await prisma.membership.findFirst({
    where: { id: membershipId, tenantId },
    select: { planName: true, customerAccount: { select: { name: true } } },
  });
  if (!membership) return null;

  const charges = await prisma.membershipCharge.findMany({
    where: { membershipId, tenantId },
    orderBy: { createdAt: 'desc' },
    take: 24,
    select: { amountCents: true, status: true, paidAt: true, createdAt: true },
  });

  const fullDate = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: timezone,
  });

  return {
    name: firstName(membership.customerAccount.name),
    planName: membership.planName,
    rows: charges.map((c) => ({
      dateLabel: fullDate.format(c.paidAt ?? c.createdAt),
      amountLabel: brl2(c.amountCents),
      statusLabel: PAYMENT_STATUS_LABEL[c.status] ?? c.status,
      paid: c.status === 'PAID',
    })),
  };
}
