import 'server-only';

// Consultas de LEITURA da fila de espera para o PAINEL DO DONO. Só leem - a engine
// (waitlist.ts) é quem escreve/notifica. A métrica de recuperação, a lista agrupada e o
// estado ao vivo são todas leituras/agregações diretas do banco (nada mockado).

import { prisma } from '@haru/database';
import { formatBRLShort, isoDateInTz, localWallTimeToUtc } from '@haru/shared';

import { dateStrOf, dayLabel } from '@/lib/waitlist-core';

/**
 * Vagas recuperadas pela fila num período: quantas + receita (soma dos preços). Ancora em
 * `createdAt` (quando a vaga foi recuperada), não no horário do atendimento. Exportada
 * porque o relatório semanal (weekly-report.ts) reusa a mesma métrica na janela da semana.
 */
export async function recoveredStats(
  tenantId: string,
  range: { from: Date; to: Date },
): Promise<{ count: number; revenueCents: number }> {
  const appts = await prisma.appointment.findMany({
    where: {
      tenantId,
      fromWaitlist: true,
      status: { not: 'CANCELED' },
      createdAt: { gte: range.from, lt: range.to },
    },
    select: { service: { select: { priceCents: true } } },
  });
  return {
    count: appts.length,
    revenueCents: appts.reduce((sum, a) => sum + a.service.priceCents, 0),
  };
}

/** R$ sem centavos (padrão do painel). Vive em @haru/shared - aqui é só o nome curto local. */
export const money = formatBRLShort;

/**
 * Início do mês (offset em meses) como instante UTC, ancorado no FUSO DO TENANT: o dia 1
 * 00:00 local vira o UTC correspondente (ex.: 03:00Z em SP), não meia-noite UTC. Sem isso,
 * recuperações entre 00:00-03:00Z do dia 1 caíam no mês errado e distorciam o delta.
 */
function monthStart(tz: string, offset = 0): Date {
  const [y, m] = isoDateInTz(new Date(), tz).split('-').map(Number);
  const total = y * 12 + (m - 1) + offset; // m é 1-based; total em meses absolutos
  const dateStr = `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}-01`;
  return localWallTimeToUtc(dateStr, 0, tz);
}

// ── Métrica de recuperação ────────────────────────────────────────────────────

export type RecoveryMetric = {
  cents: number;
  count: number;
  label: string;
  countLabel: string;
  deltaPct: number | null;
  deltaLabel: string | null;
};

/** "R$ recuperados este mês" + comparativo com o mês anterior. */
export async function getRecoveryMetric(tenantId: string, tz: string): Promise<RecoveryMetric> {
  const curStart = monthStart(tz);
  const prevStart = monthStart(tz, -1);
  const now = new Date();

  const [cur, prev] = await Promise.all([
    recoveredStats(tenantId, { from: curStart, to: now }),
    recoveredStats(tenantId, { from: prevStart, to: curStart }),
  ]);

  const deltaPct =
    prev.revenueCents > 0
      ? Math.round(((cur.revenueCents - prev.revenueCents) / prev.revenueCents) * 100)
      : null;

  return {
    cents: cur.revenueCents,
    count: cur.count,
    label: money(cur.revenueCents),
    countLabel:
      cur.count === 0
        ? 'nenhuma vaga recuperada ainda'
        : `${cur.count} ${cur.count === 1 ? 'horário preenchido' : 'horários preenchidos'} sozinho`,
    deltaPct,
    deltaLabel: deltaPct === null ? null : `${deltaPct >= 0 ? '+' : ''}${deltaPct}%`,
  };
}

// ── Lista agrupada (dia + profissional) ───────────────────────────────────────

export type WaitlistPerson = {
  entryId: string;
  position: number;
  contactName: string;
  serviceId: string;
  serviceName: string;
  priceCents: number;
  priceLabel: string;
  sinceLabel: string;
};

export type WaitlistGroup = {
  key: string;
  dateStr: string;
  dayLabel: string;
  professionalId: string;
  professionalName: string | null;
  count: number;
  hasActiveOffer: boolean;
  people: WaitlistPerson[];
};

/** "agora" / "hoje" / "ontem" / "há N dias" a partir de createdAt. */
function sinceLabelOf(createdAt: Date, tz: string): string {
  const today = isoDateInTz(new Date(), tz);
  const then = isoDateInTz(createdAt, tz);
  if (then === today) {
    const mins = Math.floor((Date.now() - createdAt.getTime()) / 60_000);
    return mins < 60 ? 'entrou agora' : 'entrou hoje';
  }
  const days = Math.round(
    (new Date(`${today}T00:00:00Z`).getTime() - new Date(`${then}T00:00:00Z`).getTime()) /
      86_400_000,
  );
  return days === 1 ? 'entrou ontem' : `há ${days} dias na fila`;
}

/** Fila agrupada por (dia, profissional), só de hoje pra frente. Ordem = FIFO. */
export async function getWaitlistGroups(tenantId: string, tz: string): Promise<WaitlistGroup[]> {
  const todayStr = isoDateInTz(new Date(), tz);
  const entries = await prisma.waitlistEntry.findMany({
    where: { tenantId, status: 'WAITING', date: { gte: new Date(`${todayStr}T00:00:00.000Z`) } },
    orderBy: [{ date: 'asc' }, { professionalId: 'asc' }, { createdAt: 'asc' }],
    include: {
      contact: { select: { name: true } },
      service: { select: { name: true, priceCents: true } },
      professional: { select: { name: true } },
    },
  });
  if (entries.length === 0) return [];

  const activeOffers = await prisma.waitlistOffer.findMany({
    where: { tenantId, status: 'ACTIVE', holdExpiresAt: { gt: new Date() } },
    select: { professionalId: true, date: true },
  });
  const offerKeys = new Set(activeOffers.map((o) => `${dateStrOf(o.date)}|${o.professionalId}`));

  const groups = new Map<string, WaitlistGroup>();
  for (const e of entries) {
    const ds = dateStrOf(e.date);
    const key = `${ds}|${e.professionalId}`;
    let g = groups.get(key);
    if (!g) {
      g = {
        key,
        dateStr: ds,
        dayLabel: capitalize(dayLabel(ds, tz)),
        professionalId: e.professionalId,
        professionalName: e.professional.name,
        count: 0,
        hasActiveOffer: offerKeys.has(key),
        people: [],
      };
      groups.set(key, g);
    }
    g.count += 1;
    g.people.push({
      entryId: e.id,
      position: g.count,
      contactName: e.contact.name ?? 'Cliente',
      serviceId: e.serviceId,
      serviceName: e.service.name,
      priceCents: e.service.priceCents,
      priceLabel: money(e.service.priceCents),
      sinceLabel: sinceLabelOf(e.createdAt, tz),
    });
  }
  return [...groups.values()];
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Insight (a maior oportunidade) ────────────────────────────────────────────

export type WaitlistInsight = {
  professionalName: string | null;
  dayLabel: string;
  professionalId: string;
  dateStr: string;
  count: number;
  suggestSlots: number;
  estimatedLabel: string;
  serviceId: string;
} | null;

/** Deriva o insight do grupo com mais gente esperando (pura, reusa os grupos já lidos). */
export function getWaitlistInsight(groups: WaitlistGroup[]): WaitlistInsight {
  const g = [...groups].filter((x) => x.count >= 2).sort((a, b) => b.count - a.count)[0];
  if (!g) return null;
  const suggestSlots = Math.min(g.count, 2);
  const estimatedCents = g.people.slice(0, suggestSlots).reduce((acc, p) => acc + p.priceCents, 0);
  return {
    professionalName: g.professionalName,
    dayLabel: g.dayLabel,
    professionalId: g.professionalId,
    dateStr: g.dateStr,
    count: g.count,
    suggestSlots,
    estimatedLabel: money(estimatedCents),
    serviceId: g.people[0]?.serviceId ?? '',
  };
}

// ── Estado ao vivo (uma oferta acontecendo agora) ─────────────────────────────

export type ActiveOfferLive = {
  professionalName: string | null;
  dayLabel: string;
  notified: number;
  total: number;
  progressPct: number;
  nextWaveInMin: number;
} | null;

/** A oferta ativa mais recente (vaga aberta, avisando em ondas) - o card "ao vivo". */
export async function getActiveOfferLive(tenantId: string, tz: string): Promise<ActiveOfferLive> {
  const offer = await prisma.waitlistOffer.findFirst({
    where: { tenantId, status: 'ACTIVE', holdExpiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
    include: { professional: { select: { name: true } } },
  });
  if (!offer) return null;

  const total = await prisma.waitlistEntry.count({
    where: {
      tenantId,
      professionalId: offer.professionalId,
      date: offer.date,
      status: 'WAITING',
    },
  });
  const notified = offer.notifiedEntryIds.length;
  const nextWaveInMin = Math.max(0, Math.ceil((offer.nextWaveAt.getTime() - Date.now()) / 60_000));
  return {
    professionalName: offer.professional.name,
    dayLabel: capitalize(dayLabel(dateStrOf(offer.date), tz)),
    notified,
    total: Math.max(total, notified),
    progressPct: total > 0 ? Math.min(100, Math.round((notified / total) * 100)) : 0,
    nextWaveInMin,
  };
}
