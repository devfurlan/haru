import 'server-only';

// MOTOR DE MÉTRICAS - fonte ÚNICA de faturamento/atendimento/ocupação do painel do dono.
// Camada de IO: lê o banco uma vez e delega a matemática ao núcleo puro (metrics-core.ts,
// coberto pelo self-check). Filtra por período + profissional + serviço; escopo por tenant
// hoje, extensível a unidade no futuro (ver MetricsScope). NENHUMA outra parte do sistema
// deve recalcular faturamento/atendimento por conta própria - tudo passa por aqui.
//
// Perf: agregação on-the-fly (sem tabela de rollup) sobre o índice [tenantId, startsAt] já
// existente. No volume de um negócio de serviço (~1500 appts/mês) é barato mesmo com refresh
// frequente. ponytail: rollup só se algum tenant passar de ~100k appts/ano.

import { prisma } from '@haru/database';

import { getSubscriptionMetrics } from '@/lib/subscriptions-panel';
import { recoveredStats } from '@/lib/waitlist-panel';

import {
  computeCoreMetrics,
  computeOccupancy,
  isRealized,
  revenueOf,
  type CoreMetrics,
  type MetricRow,
  type OccupancyResult,
} from './metrics-core';

/** Escopo do recorte. tenantId hoje; ponytail: `unitId?` entra aqui quando multi-unidade
 *  chegar - o `where` da query ganha uma linha, sem reescrever o motor. */
export interface MetricsScope {
  tenantId: string;
}

export interface MetricsQuery {
  scope: MetricsScope;
  /** Instantes UTC. O CALLER converte "esta semana no fuso do tenant" -> [from, to). */
  from: Date;
  to: Date;
  professionalId?: string;
  serviceId?: string;
  /** Momento de referência p/ "realizado" (default agora). Só muda período corrente. */
  now?: Date;
}

export interface Metrics extends CoreMetrics {
  occupancy: OccupancyResult;
  /** Receita recorrente das assinaturas (Clube). Snapshot tenant-level em `to` - IGNORA os
   *  filtros de profissional/serviço (assinatura não é por atendimento). */
  mrr: { cents: number; activeCount: number };
  /** Vagas recuperadas pela fila no período (ancorado em quando a vaga foi preenchida). */
  recovered: { count: number; revenueCents: number };
}

/**
 * Faturamento REALIZADO do período - versão enxuta (uma query só) para janelas de comparação
 * (mesmo dia semana passada, mês anterior no mesmo ponto etc.) sem pagar as consultas de
 * ocupação/MRR/novo×recorrente do getMetrics completo. Mesma regra e mesma fonte de preço
 * (isRealized + revenueOf) - não é um segundo cálculo de faturamento, é o mesmo com menos IO.
 */
export async function getRevenue(q: MetricsQuery): Promise<number> {
  const { scope, from, to, professionalId, serviceId } = q;
  const now = q.now ?? new Date();
  const rows = await prisma.appointment.findMany({
    where: {
      tenantId: scope.tenantId,
      startsAt: { gte: from, lt: to },
      ...(professionalId ? { professionalId } : {}),
      ...(serviceId ? { serviceId } : {}),
    },
    select: { endsAt: true, status: true, service: { select: { priceCents: true } } },
  });
  return rows
    .filter((r) => isRealized(r, now))
    .reduce((s, r) => s + revenueOf({ priceCents: r.service.priceCents }), 0);
}

/**
 * Todas as métricas do período para o escopo/filtros dados. Uma chamada = uma foto completa
 * (faturamento, contagens, taxas, ticket, ocupação, top serviços, novo×recorrente, MRR,
 * recuperadas). Chame com `professionalId`/`serviceId` para fatiar; sem eles, o tenant inteiro.
 */
export async function getMetrics(q: MetricsQuery): Promise<Metrics> {
  const { scope, from, to, professionalId, serviceId } = q;
  const now = q.now ?? new Date();
  const tenantId = scope.tenantId;

  const apptWhere = {
    tenantId,
    startsAt: { gte: from, lt: to },
    ...(professionalId ? { professionalId } : {}),
    ...(serviceId ? { serviceId } : {}),
  };

  const [tenant, rowsRaw] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { timezone: true } }),
    prisma.appointment.findMany({
      where: apptWhere,
      select: {
        startsAt: true,
        endsAt: true,
        status: true,
        contactId: true,
        professionalId: true,
        serviceId: true,
        service: { select: { name: true, priceCents: true, durationMinutes: true } },
      },
    }),
  ]);
  const tz = tenant?.timezone ?? 'America/Sao_Paulo';

  const rows: MetricRow[] = rowsRaw.map((a) => ({
    startsAt: a.startsAt,
    endsAt: a.endsAt,
    status: a.status,
    priceCents: a.service.priceCents,
    serviceId: a.serviceId,
    serviceName: a.service.name,
    contactId: a.contactId,
    professionalId: a.professionalId,
    durationMinutes: a.service.durationMinutes,
  }));

  // Primeira visita (histórico inteiro) só dos contatos que aparecem no período - âncora do
  // novo×recorrente. Não-cancelado: quem faltou já era cliente conhecido. Anchor = startsAt
  // (a data de uma visita é o início dela).
  const contactIds = [...new Set(rows.map((r) => r.contactId))];
  const [firstVisits, blocks, exceptions, sub, recovered] = await Promise.all([
    contactIds.length
      ? prisma.appointment.groupBy({
          by: ['contactId'],
          where: { tenantId, status: { not: 'CANCELED' }, contactId: { in: contactIds } },
          _min: { startsAt: true },
        })
      : Promise.resolve([]),
    prisma.scheduleBlock.findMany({
      where: { tenantId, ...(professionalId ? { professionalId } : {}) },
      select: { professionalId: true, weekday: true, startMinute: true, endMinute: true },
    }),
    prisma.scheduleException.findMany({
      where: {
        tenantId,
        startsAt: { lt: to },
        endsAt: { gt: from },
        ...(professionalId ? { OR: [{ professionalId }, { professionalId: null }] } : {}),
      },
      select: { professionalId: true, startsAt: true, endsAt: true },
    }),
    getSubscriptionMetrics(tenantId, now),
    recoveredStats(tenantId, { from, to }, { professionalId, serviceId }),
  ]);

  const firstVisitByContact = new Map<string, Date>();
  for (const f of firstVisits)
    if (f._min.startsAt) firstVisitByContact.set(f.contactId, f._min.startsAt);

  const core = computeCoreMetrics(rows, now, {
    window: { start: from, end: to },
    firstVisitByContact,
  });
  const occupancy = computeOccupancy({ tz, from, to, blocks, exceptions, rows });

  return {
    ...core,
    occupancy,
    mrr: { cents: sub.mrrCents, activeCount: sub.activeCount },
    recovered,
  };
}
