// Self-check do MOTOR de métricas (parte pura). Roda com:
//   tsx apps/web/src/lib/metrics/metrics-core.test.ts
//
// Prova: (1) a regra canônica isRealized (incluindo a janela pré-cron); (2) computeCoreMetrics
// produz os mesmos números que o relatório semanal produzia (reconciliação com buildWeeklyReport);
// (3) a correção sobre a heurística antiga (conta o que terminou mas ainda não virou COMPLETED;
// NÃO conta o que está em andamento); (4) computeOccupancy.

import assert from 'node:assert/strict';

import { buildWeeklyReport, weekWindow, type WeeklyReportInput } from '../weekly-report-core';
import {
  computeCoreMetrics,
  computeOccupancy,
  isRealized,
  revenueOf,
  type MetricRow,
} from './metrics-core';

const H = 60 * 60_000;

// ── 1. Regra canônica isRealized ────────────────────────────────────────────────
const now = new Date('2026-07-15T18:00:00.000Z');
const past = new Date(now.getTime() - H); // terminou há 1h
const future = new Date(now.getTime() + H); // termina daqui 1h (em andamento/futuro)

// Já terminou e não foi cancelado/falta => realizado, INDEPENDENTE do status ter virado
// COMPLETED. É o coração da decisão: cobre a janela entre o fim e o cron noturno.
assert.equal(isRealized({ endsAt: past, status: 'COMPLETED' }, now), true);
assert.equal(isRealized({ endsAt: past, status: 'CONFIRMED' }, now), true); // pré-cron
assert.equal(isRealized({ endsAt: past, status: 'PENDING' }, now), true); // pré-cron
assert.equal(isRealized({ endsAt: past, status: 'NO_SHOW' }, now), false);
assert.equal(isRealized({ endsAt: past, status: 'CANCELED' }, now), false);
// Ainda não terminou (em andamento ou futuro) => NÃO realizado, mesmo que já tenha começado.
assert.equal(isRealized({ endsAt: future, status: 'CONFIRMED' }, now), false);

assert.equal(revenueOf({ priceCents: 4200 }), 4200);

// ── 2 + 3. computeCoreMetrics: mesmos números do relatório semanal ──────────────
// Mesma semana/fixture do weekly-report.check.mts (semana passada completa), pra provar que
// unificar não mudou nenhum número.
const TZ = 'America/Sao_Paulo';
const MONDAY_8AM = new Date('2026-07-13T11:00:00.000Z');
const w = weekWindow(MONDAY_8AM, TZ);

const row = (
  o: Partial<MetricRow> & Pick<MetricRow, 'startsAt' | 'status' | 'contactId'>,
): MetricRow => ({
  endsAt: new Date(o.startsAt.getTime() + H),
  professionalId: 'p1',
  serviceId: 's1',
  serviceName: 'Corte',
  priceCents: 5000,
  durationMinutes: 60,
  ...o,
});

const rows: MetricRow[] = [
  row({ startsAt: new Date('2026-07-06T12:00:00.000Z'), status: 'COMPLETED', contactId: 'c1' }),
  row({ startsAt: new Date('2026-07-06T17:00:00.000Z'), status: 'COMPLETED', contactId: 'c2' }),
  row({
    startsAt: new Date('2026-07-07T13:00:00.000Z'),
    status: 'NO_SHOW',
    contactId: 'c3',
    serviceId: 's2',
    serviceName: 'Barba',
    priceCents: 3000,
  }),
  row({ startsAt: new Date('2026-07-08T12:00:00.000Z'), status: 'CANCELED', contactId: 'c4' }),
];
const firstVisitByContact = new Map<string, Date>([
  ['c1', new Date('2026-07-06T12:00:00.000Z')], // 1ª vez nesta semana -> novo
  ['c2', new Date('2026-01-05T12:00:00.000Z')], // já vinha -> recorrente
]);

const m = computeCoreMetrics(rows, MONDAY_8AM, {
  window: { start: w.start, end: w.end },
  firstVisitByContact,
});
assert.equal(m.total, 4);
assert.equal(m.realized, 2); // NO_SHOW e CANCELED não contam
assert.equal(m.canceled, 1);
assert.equal(m.noShow, 1);
assert.equal(m.revenueCents, 10_000); // 2 x R$ 50 - falta não entra
assert.equal(m.ticketCents, 5_000);
assert.equal(m.attendanceRate, 2 / 3);
assert.equal(m.noShowRate, 1 / 3);
assert.equal(m.newCustomers, 1);
assert.equal(m.returningCustomers, 1);
assert.deepEqual(m.topServices, [
  { serviceId: 's1', name: 'Corte', count: 2, revenueCents: 10_000 },
]);
assert.equal(m.upcoming, 0); // semana passada completa: nada por vir
assert.equal(m.total, m.realized + m.noShow + m.canceled + m.upcoming); // partição exata

// Reconciliação DIRETA: o relatório semanal (que agora consome o motor) e o motor produzem os
// MESMOS números sobre a mesma entrada - fonte única, sem divergência.
const wr: WeeklyReportInput = {
  tz: TZ,
  now: MONDAY_8AM,
  window: w,
  appts: rows,
  prevAppts: [],
  attendance: {
    total: 3,
    attended: 2,
    noShow: 1,
    attendanceRate: 2 / 3,
    noShowRate: 1 / 3,
    confirmedShare: 1,
    pros: [],
  },
  blocks: [],
  exceptions: [],
  firstVisitByContact,
  reminderMinutesBefore: 30,
  recovered: null,
  club: null,
};
const r = buildWeeklyReport(wr)!;
assert.equal(r.revenueCents, m.revenueCents);
assert.equal(r.attended, m.realized);
assert.equal(r.canceled, m.canceled);
assert.equal(r.total, m.total);
assert.equal(r.ticketCents, m.ticketCents);
assert.equal(r.newCustomers, m.newCustomers);
assert.equal(r.returningCustomers, m.returningCustomers);
assert.deepEqual(
  r.topServices,
  m.topServices.map((s) => ({ name: s.name, count: s.count, revenueCents: s.revenueCents })),
);

// ── 3b. Correção vs a heurística antiga (período CORRENTE) ───────────────────────
// Cenário de "hoje" com o cron ainda não rodado.
const today = {
  start: new Date('2026-07-15T00:00:00.000Z'),
  end: new Date('2026-07-16T00:00:00.000Z'),
};
const curRows: MetricRow[] = [
  // Terminou às 11h, cron noturno ainda não rodou -> status CONFIRMED. Um teste `== COMPLETED`
  // PERDERIA este faturamento o dia todo; isRealized conta.
  row({ startsAt: new Date('2026-07-15T10:00:00.000Z'), status: 'CONFIRMED', contactId: 'a' }),
  // Em andamento: começou 17:30, termina 18:30 (depois de `now`=18:00). A heurística antiga
  // (startsAt < now) contaria como receita; isRealized NÃO conta até terminar.
  row({
    startsAt: new Date('2026-07-15T17:30:00.000Z'),
    endsAt: new Date('2026-07-15T18:30:00.000Z'),
    status: 'CONFIRMED',
    contactId: 'b',
  }),
  // Já fechado pelo dono.
  row({ startsAt: new Date('2026-07-15T09:00:00.000Z'), status: 'COMPLETED', contactId: 'c' }),
];
const cm = computeCoreMetrics(curRows, now, { window: today, firstVisitByContact: new Map() });
assert.equal(cm.realized, 2); // ended-CONFIRMED + COMPLETED; em-andamento fica de fora
assert.equal(cm.revenueCents, 10_000); // 2 x R$ 50; o em-andamento não soma
assert.equal(cm.upcoming, 1); // o em-andamento (CONFIRMED, não terminou)
assert.equal(cm.total, cm.realized + cm.noShow + cm.canceled + cm.upcoming);

// ── 4. computeOccupancy ─────────────────────────────────────────────────────────
// Segunda 2026-07-13, expediente 08:00-18:00Z (600min), 1 atendimento de 60min.
const occ = computeOccupancy({
  tz: 'UTC',
  from: new Date('2026-07-13T00:00:00.000Z'),
  to: new Date('2026-07-14T00:00:00.000Z'),
  blocks: [{ professionalId: 'p1', weekday: 1, startMinute: 480, endMinute: 1080 }],
  exceptions: [],
  rows: [
    {
      startsAt: new Date('2026-07-13T09:00:00.000Z'),
      endsAt: new Date('2026-07-13T10:00:00.000Z'),
      status: 'CONFIRMED',
    },
  ],
});
assert.equal(occ.capacityMin, 600);
assert.equal(occ.bookedMin, 60);
assert.equal(occ.idleMin, 540);
assert.equal(occ.occupancy, 0.1);

// Folga cobrindo metade da manhã reduz a capacidade; cancelado não conta como reservado.
const occExc = computeOccupancy({
  tz: 'UTC',
  from: new Date('2026-07-13T00:00:00.000Z'),
  to: new Date('2026-07-14T00:00:00.000Z'),
  blocks: [{ professionalId: 'p1', weekday: 1, startMinute: 480, endMinute: 1080 }],
  exceptions: [
    {
      professionalId: 'p1',
      startsAt: new Date('2026-07-13T08:00:00.000Z'),
      endsAt: new Date('2026-07-13T10:00:00.000Z'),
    },
  ],
  rows: [
    {
      startsAt: new Date('2026-07-13T11:00:00.000Z'),
      endsAt: new Date('2026-07-13T12:00:00.000Z'),
      status: 'CANCELED',
    },
  ],
});
assert.equal(occExc.capacityMin, 480); // 600 - 120 de folga
assert.equal(occExc.bookedMin, 0); // cancelado não reserva

console.log('metrics-core: OK');
