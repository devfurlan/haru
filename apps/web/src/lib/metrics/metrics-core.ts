// Núcleo PURO do motor de métricas (sem DB, sem server-only) - importável pelo self-check
// sob tsx. A parte que toca o banco vive em metrics.ts. Aqui só entra a REGRA CANÔNICA de
// "atendimento realizado" e a matemática de agregação (faturamento, contagens, ticket,
// comparecimento, top serviços, novo×recorrente, ocupação).
//
// FONTE ÚNICA de "realizado/compareceu" no sistema inteiro. Antes existiam duas definições
// divergentes (status == COMPLETED vs heurística startsAt); agora é só `isRealized` (endsAt).
// Ver a decisão em appointment-status.ts (isAttended/isReviewable delegam aqui).

import type { AppointmentStatus } from '@haru/database';
import { formatTimeInTz, isoDateInTz, localWallTimeToUtc, weekdayInTz } from '@haru/shared';

const MS_PER_MIN = 60_000;
const DAY_MS = 86_400_000;

// ── A regra canônica ────────────────────────────────────────────────────────────

/**
 * Atendimento REALIZADO = já terminou (`endsAt < now`) e não foi cancelado nem falta.
 *
 * Por que `endsAt` e não `status == COMPLETED`: o cron de fechamento roda 1x/dia, então um
 * atendimento que terminou às 15h fica em PENDING/CONFIRMED até o cron noturno - um teste
 * `== COMPLETED` subcontaria o dia inteiro. `endsAt < now && !falta/cancelado` deriva o
 * "realizado" do relógio em vez de esperar o job: DEPOIS do cron é idêntico a `== COMPLETED`,
 * ANTES cobre a janela por construção. Um atendimento EM ANDAMENTO (começou, não terminou)
 * ainda não conta - o dinheiro entra quando o serviço é entregue, que é o mesmo universo que
 * o cron e o "fechar o dia" já usam (endsAt < now).
 */
export function isRealized(
  appt: { endsAt: Date; status: AppointmentStatus },
  now: Date = new Date(),
): boolean {
  return appt.endsAt < now && appt.status !== 'CANCELED' && appt.status !== 'NO_SHOW';
}

/**
 * Valor de um atendimento para faturamento. Hoje = preço de tabela do serviço no momento da
 * leitura. ponytail: preço AO VIVO (não há snapshot no Appointment) - quando comissões
 * entrarem e o histórico precisar ser imutável, o snapshot troca AQUI (um ponto só). Mudar o
 * preço de um serviço hoje reescreve o faturamento histórico; é o comportamento atual de todas
 * as telas, mantido de propósito para a migração bater os mesmos números.
 */
export function revenueOf(appt: { priceCents: number }): number {
  return appt.priceCents;
}

// ── Entradas ──────────────────────────────────────────────────────────────────

export interface MetricRow {
  startsAt: Date;
  endsAt: Date;
  status: AppointmentStatus;
  priceCents: number;
  serviceId: string;
  serviceName: string;
  contactId: string;
  professionalId: string;
  durationMinutes: number;
}

export interface ScheduleBlockInput {
  professionalId: string;
  weekday: number;
  startMinute: number;
  endMinute: number;
}

export interface ScheduleExceptionInput {
  /** null = folga do estabelecimento inteiro (vale pra todos os profissionais). */
  professionalId: string | null;
  startsAt: Date;
  endsAt: Date;
}

// ── Saída ───────────────────────────────────────────────────────────────────────

export interface TopService {
  serviceId: string;
  name: string;
  count: number;
  revenueCents: number;
}

export interface CoreMetrics {
  /** Todos os agendamentos do período (inclui cancelados e futuros da janela). */
  total: number;
  /** Realizados = isRealized (== "atendidos" / "compareceram"). */
  realized: number;
  canceled: number;
  /** Faltas já terminadas (NO_SHOW só é marcado em atendimento que terminou). */
  noShow: number;
  /** Ainda por vir no período: não terminou e ativo (PENDING/CONFIRMED). Partição exata:
   *  total = realized + noShow + canceled + upcoming. */
  upcoming: number;
  revenueCents: number;
  ticketCents: number;
  /** realized / (realized + noShow) - mesmo denominador (terminados, não cancelados) do
   *  computeAttendanceStats, então os dois números batem por construção. */
  attendanceRate: number;
  noShowRate: number;
  /** Serviços do período por receita (desc), TODOS - o caller fatia (ex.: top 3). */
  topServices: TopService[];
  newCustomers: number;
  returningCustomers: number;
}

export interface OccupancyResult {
  capacityMin: number;
  bookedMin: number;
  idleMin: number;
  /** 0..1 (capacidade 0 => 0). */
  occupancy: number;
}

// ── Métricas escalares ────────────────────────────────────────────────────────

const rate = (n: number, d: number): number => (d > 0 ? n / d : 0);

/**
 * Todas as métricas escalares de um conjunto de agendamentos de um período. `now` decide o que
 * já é realizado; `window` + `firstVisitByContact` classificam novo×recorrente (contato é novo
 * quando o PRIMEIRO atendimento dele no tenant caiu dentro da janela).
 */
export function computeCoreMetrics(
  rows: MetricRow[],
  now: Date,
  opts: { window: { start: Date; end: Date }; firstVisitByContact: Map<string, Date> },
): CoreMetrics {
  const total = rows.length;
  const canceled = rows.filter((r) => r.status === 'CANCELED').length;

  // Universo do comparecimento: terminou e não cancelado. Espelha getAttendanceRows/
  // computeAttendanceStats para os números baterem entre motor e card de comparecimento.
  const ended = rows.filter((r) => r.endsAt < now && r.status !== 'CANCELED');
  const noShow = ended.filter((r) => r.status === 'NO_SHOW').length;
  const realizedRows = ended.filter((r) => r.status !== 'NO_SHOW'); // == isRealized
  const realized = realizedRows.length;
  // Ainda por vir: não terminou e ativo. Fecha a partição total = realized+noShow+canceled+upcoming.
  const upcoming = rows.filter(
    (r) => r.endsAt >= now && (r.status === 'PENDING' || r.status === 'CONFIRMED'),
  ).length;

  const revenueCents = realizedRows.reduce((s, r) => s + revenueOf(r), 0);
  const ticketCents = realized > 0 ? Math.round(revenueCents / realized) : 0;

  const byService = new Map<string, TopService>();
  for (const r of realizedRows) {
    const cur = byService.get(r.serviceId) ?? {
      serviceId: r.serviceId,
      name: r.serviceName,
      count: 0,
      revenueCents: 0,
    };
    cur.count++;
    cur.revenueCents += revenueOf(r);
    byService.set(r.serviceId, cur);
  }
  const topServices = [...byService.values()].sort(
    (a, b) => b.revenueCents - a.revenueCents || b.count - a.count,
  );

  let newCustomers = 0;
  let returningCustomers = 0;
  for (const contactId of new Set(realizedRows.map((r) => r.contactId))) {
    const first = opts.firstVisitByContact.get(contactId);
    if (first && first >= opts.window.start && first < opts.window.end) newCustomers++;
    else returningCustomers++;
  }

  return {
    total,
    realized,
    canceled,
    noShow,
    upcoming,
    revenueCents,
    ticketCents,
    attendanceRate: rate(realized, realized + noShow),
    noShowRate: rate(noShow, realized + noShow),
    topServices,
    newCustomers,
    returningCustomers,
  };
}

// ── Ocupação: capacidade x reservado ────────────────────────────────────────────

interface Interval {
  s: number;
  e: number;
}

/** Une intervalos sobrepostos pra folga sobreposta não ser descontada duas vezes. */
export function mergeIntervals(list: Interval[]): Interval[] {
  const out: Interval[] = [];
  for (const it of [...list].sort((a, b) => a.s - b.s)) {
    const last = out[out.length - 1];
    if (last && it.s <= last.e) last.e = Math.max(last.e, it.e);
    else out.push({ ...it });
  }
  return out;
}

export const overlapMs = (a: Interval, b: Interval): number =>
  Math.max(0, Math.min(a.e, b.e) - Math.max(a.s, b.s));

/** Minuto do dia (0..1439) de um instante lido no fuso do tenant. */
export function localMinuteOfDay(d: Date, tz: string): number {
  const [h, m] = formatTimeInTz(d, tz).split(':').map(Number);
  return h * 60 + m;
}

/** Dias civis "YYYY-MM-DD" (fuso do tenant) que o intervalo [from, to) toca. */
export function civilDaysBetween(from: Date, to: Date, tz: string): string[] {
  const days: string[] = [];
  const startStr = isoDateInTz(from, tz);
  // Último dia tocado = dia civil do instante logo antes de `to` (to é exclusivo).
  const endStr = isoDateInTz(new Date(to.getTime() - 1), tz);
  let cur = startStr;
  // Aritmética de calendário via UTC (Date.UTC trata overflow de mês).
  while (cur <= endStr) {
    days.push(cur);
    const [y, m, d] = cur.split('-').map(Number);
    cur = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
    if (days.length > 400) break; // ponytail: guarda contra range absurdo (janela máx ~1 ano)
  }
  return days;
}

/**
 * Ocupação AGREGADA de um período: capacidade (janelas de expediente menos folgas, por
 * profissional) vs reservado (duração dos agendamentos não cancelados). Mesma matemática de
 * intervalo do computeDayparts (relatório semanal), sem a fatia manhã/tarde - o breakdown por
 * daypart segue no weekly-report-core, pro insight. Já filtre `blocks`/`rows` pelo profissional
 * no caller quando quiser ocupação de UM profissional.
 *
 * ponytail: agendamento sobreposto (overlap é permitido) soma em dobro no reservado, por isso o
 * ocioso é clampado em >= 0 e a ocupação em <= 1. Modelo grosseiro de propósito - mesmo do
 * relatório; refinar pra interseção real só se o dono contestar o número.
 */
export function computeOccupancy(input: {
  tz: string;
  from: Date;
  to: Date;
  blocks: ScheduleBlockInput[];
  exceptions: ScheduleExceptionInput[];
  rows: { startsAt: Date; endsAt: Date; status: AppointmentStatus }[];
}): OccupancyResult {
  const { tz, from, to, blocks, exceptions, rows } = input;
  const days = civilDaysBetween(from, to, tz);

  // Folgas aplicáveis por profissional (as do estabelecimento valem pra todos), já unidas.
  const exByPro = new Map<string, Interval[]>();
  const pros = new Set(blocks.map((b) => b.professionalId));
  for (const p of pros) {
    const applicable = exceptions
      .filter((x) => x.professionalId === null || x.professionalId === p)
      .map((x) => ({ s: x.startsAt.getTime(), e: x.endsAt.getTime() }));
    exByPro.set(p, mergeIntervals(applicable));
  }

  let capacityMin = 0;
  for (const dateStr of days) {
    const dow = weekdayInTz(dateStr, tz);
    for (const b of blocks) {
      if (b.weekday !== dow) continue;
      const seg: Interval = {
        s: localWallTimeToUtc(dateStr, b.startMinute, tz).getTime(),
        e: localWallTimeToUtc(dateStr, b.endMinute, tz).getTime(),
      };
      let freeMs = seg.e - seg.s;
      for (const x of exByPro.get(b.professionalId) ?? []) freeMs -= overlapMs(seg, x);
      capacityMin += Math.max(0, freeMs) / MS_PER_MIN;
    }
  }

  let bookedMin = 0;
  for (const a of rows) {
    if (a.status === 'CANCELED') continue;
    bookedMin += (a.endsAt.getTime() - a.startsAt.getTime()) / MS_PER_MIN;
  }

  capacityMin = Math.round(capacityMin);
  bookedMin = Math.round(bookedMin);
  return {
    capacityMin,
    bookedMin,
    idleMin: Math.max(0, capacityMin - bookedMin),
    occupancy: capacityMin > 0 ? Math.min(1, bookedMin / capacityMin) : 0,
  };
}

export { DAY_MS, MS_PER_MIN };
