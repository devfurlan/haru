// Lógica pura do relatório semanal do dono (sem DB, sem server-only) - importável pelo
// self-check (weekly-report.check.mts) sob tsx. A parte que toca o banco vive em
// weekly-report.ts. Aqui só entra matemática: janela da semana no fuso, capacidade x
// ocupação, e as regras determinísticas do insight.

import type { AppointmentStatus } from '@haru/database';
import { formatBRLShort, isoDateInTz, localWallTimeToUtc, weekdayInTz } from '@haru/shared';

import type { AttendanceStats } from './attendance';
import {
  computeCoreMetrics,
  isRealized,
  localMinuteOfDay,
  mergeIntervals,
  overlapMs,
  type ScheduleBlockInput,
  type ScheduleExceptionInput,
} from './metrics/metrics-core';

export type { ScheduleBlockInput, ScheduleExceptionInput };

const MS_PER_MIN = 60_000;
/** Meia-noite local em minutos: divisor manhã/tarde. */
const NOON = 12 * 60;

const WEEKDAY_NAME = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
] as const;

// ── Janela da semana ──────────────────────────────────────────────────────────

export interface WeekWindow {
  /** "YYYY-MM-DD" da SEGUNDA da semana relatada. É a chave de dedup do envio. */
  weekKey: string;
  /** Os 7 dias civis (locais) da semana relatada. */
  days: string[];
  /** Instante UTC da segunda 00:00 local (início, inclusivo). */
  start: Date;
  /** Instante UTC da segunda seguinte 00:00 local (fim, exclusivo). */
  end: Date;
  /** Início da semana ANTERIOR à relatada (baseline do comparativo). */
  prevStart: Date;
  /** "07/07 a 13/07" */
  label: string;
}

/** Soma dias a uma data civil "YYYY-MM-DD". Aritmética de calendário pura (Date.UTC trata o overflow). */
export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** "2026-07-07" -> "07/07" */
function brDay(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  return `${d}/${m}`;
}

/**
 * A última semana COMPLETA (segunda a domingo) no fuso do tenant, relativa a `now`.
 * Não assume que hoje é segunda: volta até a segunda da semana corrente e relata os 7
 * dias anteriores a ela. Assim o cron de segunda e um disparo manual numa quarta
 * relatam exatamente a mesma semana (o que torna o cron testável fora de segunda).
 */
export function weekWindow(now: Date, tz: string): WeekWindow {
  const today = isoDateInTz(now, tz);
  const dow = weekdayInTz(today, tz); // 0=domingo … 6=sábado
  const thisMonday = addDays(today, -((dow + 6) % 7)); // domingo (0) volta 6 dias, não 1
  const weekKey = addDays(thisMonday, -7);
  return {
    weekKey,
    days: Array.from({ length: 7 }, (_, i) => addDays(weekKey, i)),
    start: localWallTimeToUtc(weekKey, 0, tz),
    end: localWallTimeToUtc(thisMonday, 0, tz),
    prevStart: localWallTimeToUtc(addDays(weekKey, -7), 0, tz),
    label: `${brDay(weekKey)} a ${brDay(addDays(weekKey, 6))}`,
  };
}

// ── Entradas ──────────────────────────────────────────────────────────────────

export interface ReportApptInput {
  startsAt: Date;
  endsAt: Date;
  status: AppointmentStatus;
  contactId: string;
  professionalId: string;
  serviceId: string;
  serviceName: string;
  priceCents: number;
  durationMinutes: number;
}

// ScheduleBlockInput / ScheduleExceptionInput vivem no motor (metrics-core) e são
// re-exportados acima - fonte única dos tipos de agenda/capacidade.

export interface WeeklyReportInput {
  tz: string;
  now: Date;
  window: WeekWindow;
  appts: ReportApptInput[];
  /** Semana anterior à relatada - só pro comparativo de faturamento (regra canônica: endsAt). */
  prevAppts: { endsAt: Date; status: AppointmentStatus; priceCents: number }[];
  /** Já calculada com a métrica canônica (computeAttendanceStats). */
  attendance: AttendanceStats;
  blocks: ScheduleBlockInput[];
  exceptions: ScheduleExceptionInput[];
  /** contactId -> data do PRIMEIRO atendimento do contato no tenant (histórico inteiro). */
  firstVisitByContact: Map<string, Date>;
  /** Config do tenant: 0 = lembrete desligado. Muda a sugestão do insight de faltas. */
  reminderMinutesBefore: number;
  /** Só quando o tenant usa a fila e recuperou algo. */
  recovered: { count: number; revenueCents: number } | null;
  /** Só quando o tenant tem assinantes ativos (Clube). */
  club: { mrrCents: number; activeCount: number } | null;
}

// ── Saída ─────────────────────────────────────────────────────────────────────

export interface TopService {
  name: string;
  count: number;
  revenueCents: number;
}

export interface DaypartOccupancy {
  weekday: number;
  daypart: 'morning' | 'afternoon';
  /** "Terça de manhã" / "Sábado à tarde" */
  label: string;
  capacityMin: number;
  bookedMin: number;
  idleMin: number;
  /** 0..1 */
  occupancy: number;
}

export interface WeeklyReportData {
  weekKey: string;
  weekLabel: string;
  revenueCents: number;
  /** null = não houve semana anterior com movimento (estabelecimento novo) -> sem comparativo. */
  prevRevenueCents: number | null;
  deltaCents: number | null;
  deltaPct: number | null;
  total: number;
  attended: number;
  canceled: number;
  noShow: number;
  /** 0..1 */
  attendanceRate: number;
  noShowRate: number;
  ticketCents: number;
  idleSlots: number;
  idleCents: number;
  topServices: TopService[];
  newCustomers: number;
  returningCustomers: number;
  recovered: { count: number; revenueCents: number } | null;
  club: { mrrCents: number; activeCount: number } | null;
  insight: string;
}

// ── Capacidade x ocupação ─────────────────────────────────────────────────────
// mergeIntervals/overlapMs/localMinuteOfDay vêm do motor (metrics-core) - a matemática de
// intervalo/folga é fonte única, compartilhada com o computeOccupancy agregado.

interface Interval {
  s: number;
  e: number;
}

const daypartKey = (weekday: number, daypart: 'morning' | 'afternoon') => `${weekday}|${daypart}`;

const daypartLabel = (weekday: number, daypart: 'morning' | 'afternoon') =>
  `${WEEKDAY_NAME[weekday]} ${daypart === 'morning' ? 'de manhã' : 'à tarde'}`;

/**
 * Ocupação da semana por (dia da semana, manhã/tarde). Capacidade = janelas de expediente
 * (ScheduleBlock do weekday) menos folgas (ScheduleException), por profissional. Reservado =
 * duração dos agendamentos não cancelados.
 *
 * ponytail: um agendamento que cruza o meio-dia conta inteiro no período em que COMEÇA, e
 * agendamentos sobrepostos (overlap é permitido desde a migration que dropou a constraint)
 * somam em dobro - por isso o ocioso é clampado em >= 0. Modelo grosseiro de propósito; se o
 * dono contestar o número, refinar pra interseção real de intervalos.
 */
export function computeDayparts(input: {
  tz: string;
  window: WeekWindow;
  appts: ReportApptInput[];
  blocks: ScheduleBlockInput[];
  exceptions: ScheduleExceptionInput[];
}): DaypartOccupancy[] {
  const { tz, window, appts, blocks, exceptions } = input;

  // Folgas aplicáveis por profissional (as do estabelecimento valem pra todos), já unidas.
  const exByPro = new Map<string, Interval[]>();
  const pros = new Set(blocks.map((b) => b.professionalId));
  for (const p of pros) {
    const applicable = exceptions
      .filter((x) => x.professionalId === null || x.professionalId === p)
      .map((x) => ({ s: x.startsAt.getTime(), e: x.endsAt.getTime() }));
    exByPro.set(p, mergeIntervals(applicable));
  }

  const capacity = new Map<string, number>();
  const booked = new Map<string, number>();
  const add = (map: Map<string, number>, key: string, min: number) =>
    map.set(key, (map.get(key) ?? 0) + min);

  for (const dateStr of window.days) {
    const dow = weekdayInTz(dateStr, tz);
    for (const b of blocks) {
      if (b.weekday !== dow) continue;
      const segments: ['morning' | 'afternoon', number, number][] = [
        ['morning', b.startMinute, Math.min(b.endMinute, NOON)],
        ['afternoon', Math.max(b.startMinute, NOON), b.endMinute],
      ];
      for (const [daypart, segStart, segEnd] of segments) {
        if (segEnd <= segStart) continue;
        const seg: Interval = {
          s: localWallTimeToUtc(dateStr, segStart, tz).getTime(),
          e: localWallTimeToUtc(dateStr, segEnd, tz).getTime(),
        };
        let freeMs = seg.e - seg.s;
        for (const x of exByPro.get(b.professionalId) ?? []) freeMs -= overlapMs(seg, x);
        add(capacity, daypartKey(dow, daypart), Math.max(0, freeMs) / MS_PER_MIN);
      }
    }
  }

  for (const a of appts) {
    if (a.status === 'CANCELED') continue;
    const dow = weekdayInTz(isoDateInTz(a.startsAt, tz), tz);
    const daypart = localMinuteOfDay(a.startsAt, tz) < NOON ? 'morning' : 'afternoon';
    add(booked, daypartKey(dow, daypart), (a.endsAt.getTime() - a.startsAt.getTime()) / MS_PER_MIN);
  }

  const keys = new Set([...capacity.keys(), ...booked.keys()]);
  return [...keys]
    .map((key) => {
      const [wd, dp] = key.split('|');
      const weekday = Number(wd);
      const daypart = dp as 'morning' | 'afternoon';
      const capacityMin = Math.round(capacity.get(key) ?? 0);
      const bookedMin = Math.round(booked.get(key) ?? 0);
      return {
        weekday,
        daypart,
        label: daypartLabel(weekday, daypart),
        capacityMin,
        bookedMin,
        idleMin: Math.max(0, capacityMin - bookedMin),
        occupancy: capacityMin > 0 ? Math.min(1, bookedMin / capacityMin) : 0,
      };
    })
    .sort((a, b) => a.weekday - b.weekday || (a.daypart === 'morning' ? -1 : 1));
}

// ── Insight determinístico ────────────────────────────────────────────────────

/** Piso pra falar de dinheiro perdido com falta - abaixo disso não é acionável. */
const NO_SHOW_PAIN_CENTS = 10_000; // R$ 100
const IDLE_OCCUPANCY_MAX = 0.4;
const FULL_OCCUPANCY_MIN = 0.9;
const GROWTH_PCT_MIN = 10;

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/**
 * Uma frase acionável derivada SÓ de número já calculado - nunca inventa dado. Primeira
 * regra que dispara vence; a ordem é a da dor (ocioso costuma ser o maior R$ e é o que faz
 * o dono agir). O fallback sempre existe porque só relatamos semana com movimento.
 */
export function pickInsight(
  d: Pick<
    WeeklyReportData,
    'noShow' | 'ticketCents' | 'attended' | 'revenueCents' | 'deltaPct' | 'idleSlots'
  > & {
    dayparts: DaypartOccupancy[];
    avgDurationMinutes: number;
    reminderMinutesBefore: number;
  },
): string {
  const withCapacity = d.dayparts.filter((x) => x.capacityMin > 0);

  // 1. Horário ocioso concentrado - o número que dói.
  const emptiest = [...withCapacity].sort((a, b) => a.occupancy - b.occupancy)[0];
  if (emptiest && emptiest.occupancy < IDLE_OCCUPANCY_MAX && d.avgDurationMinutes > 0) {
    const slots = Math.floor(emptiest.idleMin / d.avgDurationMinutes);
    if (slots >= 1) {
      const pctVazia = Math.round((1 - emptiest.occupancy) * 100);
      const cents = slots * d.ticketCents;
      return `${emptiest.label} ficou ${pctVazia}% vazia (${formatBRLShort(cents)} em horários livres). Vale testar algo pra preencher.`;
    }
  }

  // 2. Faltas custaram caro.
  const lostCents = d.noShow * d.ticketCents;
  if (d.noShow >= 1 && lostCents >= NO_SHOW_PAIN_CENTS) {
    const sugestao =
      d.reminderMinutesBefore === 0
        ? 'Ativar o lembrete automático pode reduzir isso.'
        : 'Confirmar esses clientes na véspera pode reduzir isso.';
    return `Você perdeu ${formatBRLShort(lostCents)} com ${d.noShow} ${plural(d.noShow, 'falta', 'faltas')} essa semana. ${sugestao}`;
  }

  // 3. Horário que esgota - oportunidade de abrir mais.
  const fullest = [...withCapacity].sort((a, b) => b.occupancy - a.occupancy)[0];
  if (fullest && fullest.occupancy >= FULL_OCCUPANCY_MIN) {
    return `${fullest.label} lotou (${Math.round(fullest.occupancy * 100)}% da agenda ocupada). Considere abrir mais um horário.`;
  }

  // 4. Crescimento.
  if (d.deltaPct !== null && d.deltaPct >= GROWTH_PCT_MIN) {
    return `Faturamento subiu ${d.deltaPct}% vs a semana passada. Bom ritmo.`;
  }

  // 5. Fallback - só números do núcleo, sempre disponível.
  return `Você atendeu ${d.attended} ${plural(d.attended, 'cliente', 'clientes')} e faturou ${formatBRLShort(d.revenueCents)} essa semana.`;
}

// ── Montagem ──────────────────────────────────────────────────────────────────

/**
 * Monta o relatório da semana. Retorna null quando a semana relatada não teve NENHUM
 * agendamento: relatório vazio é deprimente e inútil, então simplesmente não se envia.
 */
export function buildWeeklyReport(input: WeeklyReportInput): WeeklyReportData | null {
  const { appts, prevAppts, now, attendance, window } = input;
  if (appts.length === 0) return null;

  // Métricas escalares (faturamento, ticket, contagens, top serviços, novo×recorrente) vêm do
  // MOTOR - fonte única (lib/metrics/metrics-core.ts). O relatório só acrescenta o que é dele:
  // comparativo com a semana anterior, ocupação por daypart e o insight.
  //
  // Faturamento = valor de SERVIÇO ENTREGUE (preço de tudo que foi realizado), não caixa.
  // ponytail: atendimento pago com crédito do Clube (Appointment.membershipId != null) entra
  // aqui E o dinheiro dele aparece de novo na linha "Assinaturas" (MRR) - a mesma relação
  // comercial em duas linhas. É DE PROPÓSITO (decisão confirmada com o dono do produto em
  // 14/07): pro dono, "faturamento" = "quanto de serviço eu vendi essa semana". O motor soma
  // TODOS os realizados (revenueOf não olha membershipId), preservando esse comportamento.
  const m = computeCoreMetrics(appts, now, {
    window: { start: window.start, end: window.end },
    firstVisitByContact: input.firstVisitByContact,
  });
  const revenueCents = m.revenueCents;
  const ticketCents = m.ticketCents;

  // Sem semana anterior COM MOVIMENTO não há comparativo honesto (estabelecimento novo ou
  // semana parada): omite em vez de comparar contra zero. Mesma regra canônica (isRealized).
  const prevRevenueCents =
    prevAppts.length > 0
      ? prevAppts.filter((a) => isRealized(a, now)).reduce((s, a) => s + a.priceCents, 0)
      : null;
  const deltaCents = prevRevenueCents !== null ? revenueCents - prevRevenueCents : null;
  const deltaPct =
    prevRevenueCents !== null && prevRevenueCents > 0
      ? Math.round(((revenueCents - prevRevenueCents) / prevRevenueCents) * 100)
      : null;

  // Top 3 serviços do motor (já ordenados por receita); drop do serviceId pro formato do e-mail.
  const topServices: TopService[] = m.topServices
    .slice(0, 3)
    .map((s) => ({ name: s.name, count: s.count, revenueCents: s.revenueCents }));

  const dayparts = computeDayparts(input);
  const idleMin = dayparts.reduce((s, x) => s + x.idleMin, 0);
  const avgDurationMinutes =
    appts.length > 0
      ? Math.round(appts.reduce((s, a) => s + a.durationMinutes, 0) / appts.length)
      : 0;
  const idleSlots = avgDurationMinutes > 0 ? Math.floor(idleMin / avgDurationMinutes) : 0;
  // ponytail: horário ocioso valorado a ticket médio (slot vazio ~= um atendimento que
  // não aconteceu). Grosseiro, mas é a conta que o dono faz de cabeça.
  const idleCents = idleSlots * ticketCents;

  const base = {
    weekKey: window.weekKey,
    weekLabel: window.label,
    revenueCents,
    prevRevenueCents,
    deltaCents,
    deltaPct,
    total: m.total,
    attended: m.realized,
    canceled: m.canceled,
    noShow: attendance.noShow,
    attendanceRate: attendance.attendanceRate,
    noShowRate: attendance.noShowRate,
    ticketCents,
    idleSlots,
    idleCents,
    topServices,
    newCustomers: m.newCustomers,
    returningCustomers: m.returningCustomers,
    recovered: input.recovered,
    club: input.club,
  };

  return {
    ...base,
    insight: pickInsight({
      ...base,
      dayparts,
      avgDurationMinutes,
      reminderMinutesBefore: input.reminderMinutesBefore,
    }),
  };
}
