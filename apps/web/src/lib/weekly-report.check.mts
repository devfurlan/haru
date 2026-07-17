/**
 * Self-check da lógica pura do relatório semanal. Sem framework: roda com
 *   pnpm --filter web exec tsx src/lib/weekly-report.check.mts
 * Falha (exit != 0) se a janela da semana, a conta de ocupação/ocioso, a agregação ou a
 * ordem das regras de insight quebrarem.
 */
import assert from 'node:assert/strict';

import {
  addDays,
  buildWeeklyReport,
  computeDayparts,
  pickInsight,
  weekWindow,
  type ReportApptInput,
  type WeeklyReportInput,
} from './weekly-report-core.ts';

const TZ = 'America/Sao_Paulo'; // UTC-3, sem horário de verão desde 2019
/** Segunda, 13/07/2026, 08:00 local (11:00Z) - o instante em que o cron dispara. */
const MONDAY_8AM = new Date('2026-07-13T11:00:00.000Z');
/** Intl pt-BR separa "R$" do número com NBSP (U+00A0). Normaliza pra asserção legível. */
const norm = (s: string) => s.replace(/ /g, ' ');

// ── Aritmética de calendário ──────────────────────────────────────────────────
assert.equal(addDays('2026-07-06', 7), '2026-07-13');
assert.equal(addDays('2026-07-01', -1), '2026-06-30'); // vira o mês
assert.equal(addDays('2027-01-01', -1), '2026-12-31'); // vira o ano

// ── Janela da semana ──────────────────────────────────────────────────────────
const w = weekWindow(MONDAY_8AM, TZ);
assert.equal(w.weekKey, '2026-07-06'); // relata a semana ANTERIOR, não a corrente
assert.equal(w.label, '06/07 a 12/07');
assert.equal(w.days.length, 7);
assert.equal(w.days[0], '2026-07-06'); // segunda
assert.equal(w.days[6], '2026-07-12'); // domingo
// Meia-noite LOCAL vira 03:00Z - não meia-noite UTC. Sem isso, o que aconteceu entre
// 00:00-03:00Z da segunda cairia na semana errada e distorceria o faturamento.
assert.equal(w.start.toISOString(), '2026-07-06T03:00:00.000Z');
assert.equal(w.end.toISOString(), '2026-07-13T03:00:00.000Z');
assert.equal(w.prevStart.toISOString(), '2026-06-29T03:00:00.000Z');

// Domingo: a semana corrente AINDA não fechou, então a última completa é a de antes.
const wSun = weekWindow(new Date('2026-07-12T15:00:00.000Z'), TZ);
assert.equal(wSun.weekKey, '2026-06-29');
// Terça (disparo manual/teste fora de segunda) relata a MESMA semana que a segunda.
assert.equal(weekWindow(new Date('2026-07-14T15:00:00.000Z'), TZ).weekKey, '2026-07-06');

// ── Ocupação por período ──────────────────────────────────────────────────────
const block = { professionalId: 'p1', weekday: 1, startMinute: 480, endMinute: 1080 }; // seg 08-18

const dpNoExc = computeDayparts({
  tz: TZ,
  window: w,
  appts: [],
  blocks: [block],
  exceptions: [],
});
const mon = (dp: typeof dpNoExc, part: 'morning' | 'afternoon') =>
  dp.find((x) => x.weekday === 1 && x.daypart === part)!;
assert.equal(mon(dpNoExc, 'morning').capacityMin, 240); // 08:00-12:00
assert.equal(mon(dpNoExc, 'afternoon').capacityMin, 360); // 12:00-18:00

// Folga cobrindo a manhã de segunda (08:00-12:00 local = 11:00-15:00Z) zera a capacidade.
const dpExc = computeDayparts({
  tz: TZ,
  window: w,
  appts: [],
  blocks: [block],
  exceptions: [
    {
      professionalId: 'p1',
      startsAt: new Date('2026-07-06T11:00:00.000Z'),
      endsAt: new Date('2026-07-06T15:00:00.000Z'),
    },
  ],
});
assert.equal(mon(dpExc, 'morning').capacityMin, 0);
assert.equal(mon(dpExc, 'afternoon').capacityMin, 360); // tarde intacta

// Folgas sobrepostas não descontam duas vezes (senão a capacidade ficaria negativa).
const dpOverlap = computeDayparts({
  tz: TZ,
  window: w,
  appts: [],
  blocks: [block],
  exceptions: [
    {
      professionalId: null, // folga do estabelecimento inteiro
      startsAt: new Date('2026-07-06T11:00:00.000Z'),
      endsAt: new Date('2026-07-06T14:00:00.000Z'),
    },
    {
      professionalId: 'p1',
      startsAt: new Date('2026-07-06T12:00:00.000Z'),
      endsAt: new Date('2026-07-06T15:00:00.000Z'),
    },
  ],
});
assert.equal(mon(dpOverlap, 'morning').capacityMin, 0); // união = 11-15Z, não 7h de desconto

// ── Agregação ─────────────────────────────────────────────────────────────────
const appt = (
  over: Partial<ReportApptInput> & Pick<ReportApptInput, 'startsAt' | 'status' | 'contactId'>,
): ReportApptInput => ({
  endsAt: new Date(over.startsAt.getTime() + 60 * 60_000),
  professionalId: 'p1',
  serviceId: 's1',
  serviceName: 'Corte',
  priceCents: 5000,
  durationMinutes: 60,
  ...over,
});

const appts: ReportApptInput[] = [
  appt({ startsAt: new Date('2026-07-06T12:00:00.000Z'), status: 'COMPLETED', contactId: 'c1' }), // seg 09h
  appt({ startsAt: new Date('2026-07-06T17:00:00.000Z'), status: 'COMPLETED', contactId: 'c2' }), // seg 14h
  appt({
    startsAt: new Date('2026-07-07T13:00:00.000Z'), // ter 10h
    status: 'NO_SHOW',
    contactId: 'c3',
    serviceId: 's2',
    serviceName: 'Barba',
    priceCents: 3000,
  }),
  appt({ startsAt: new Date('2026-07-08T12:00:00.000Z'), status: 'CANCELED', contactId: 'c4' }),
];

const input: WeeklyReportInput = {
  tz: TZ,
  now: MONDAY_8AM,
  window: w,
  appts,
  prevAppts: [
    { endsAt: new Date('2026-06-30T13:00:00.000Z'), status: 'COMPLETED', priceCents: 5000 },
  ],
  attendance: {
    total: 3,
    attended: 2,
    noShow: 1,
    attendanceRate: 2 / 3,
    noShowRate: 1 / 3,
    confirmedShare: 1,
    pros: [],
  },
  blocks: [block],
  exceptions: [],
  firstVisitByContact: new Map([
    ['c1', new Date('2026-07-06T12:00:00.000Z')], // 1ª vez foi nesta semana -> novo
    ['c2', new Date('2026-01-05T12:00:00.000Z')], // já vinha antes -> recorrente
  ]),
  reminderMinutesBefore: 30,
  recovered: null,
  club: null,
};

const r = buildWeeklyReport(input)!;
assert.ok(r);
assert.equal(r.weekKey, '2026-07-06');
assert.equal(r.total, 4);
assert.equal(r.attended, 2); // NO_SHOW e CANCELED não são atendimento
assert.equal(r.canceled, 1);
assert.equal(r.noShow, 1);
assert.equal(r.revenueCents, 10_000); // 2 x R$ 50 - a falta NÃO entra no faturamento
assert.equal(r.ticketCents, 5_000);
assert.equal(r.prevRevenueCents, 5_000);
assert.equal(r.deltaCents, 5_000);
assert.equal(r.deltaPct, 100);
assert.equal(r.newCustomers, 1); // c1
assert.equal(r.returningCustomers, 1); // c2 (c3 faltou e c4 cancelou: não contam)
assert.deepEqual(r.topServices, [{ name: 'Corte', count: 2, revenueCents: 10_000 }]);
// Ociosos: seg manhã 240-60=180 + seg tarde 360-60=300 = 480min / 60min = 8 slots.
assert.equal(r.idleSlots, 8);
assert.equal(r.idleCents, 40_000); // 8 x ticket de R$ 50

// Semana parada não vira relatório (é o gate do "não envia relatório vazio").
assert.equal(buildWeeklyReport({ ...input, appts: [] }), null);

// Estabelecimento novo: sem semana anterior COM MOVIMENTO, não inventa comparativo.
const novo = buildWeeklyReport({ ...input, prevAppts: [] })!;
assert.equal(novo.prevRevenueCents, null);
assert.equal(novo.deltaCents, null);
assert.equal(novo.deltaPct, null);

// ── Insight: ordem das regras + sempre entrega uma ────────────────────────────
const baseInsight = {
  noShow: 0,
  ticketCents: 8_000,
  attended: 10,
  revenueCents: 80_000,
  deltaPct: null as number | null,
  idleSlots: 0,
  dayparts: [],
  avgDurationMinutes: 60,
  reminderMinutesBefore: 30,
};
const cheia = {
  weekday: 6,
  daypart: 'afternoon' as const,
  label: 'Sábado à tarde',
  capacityMin: 240,
  bookedMin: 228,
  idleMin: 12,
  occupancy: 0.95,
};
const vazia = {
  weekday: 2,
  daypart: 'morning' as const,
  label: 'Terça de manhã',
  capacityMin: 240,
  bookedMin: 48,
  idleMin: 192,
  occupancy: 0.2,
};

// 1ª regra: horário ocioso vence até quando há falta cara (é o maior R$ e o mais acionável).
const iVazia = pickInsight({ ...baseInsight, dayparts: [vazia], noShow: 3 });
assert.ok(iVazia.startsWith('Terça de manhã ficou 80% vazia'), iVazia);
assert.ok(norm(iVazia).includes('R$ 240'), iVazia); // floor(192/60)=3 slots x R$ 80

// 2ª: faltas caras, quando não há ocioso concentrado.
const iFalta = pickInsight({ ...baseInsight, noShow: 3 });
assert.ok(norm(iFalta).includes('Você perdeu R$ 240 com 3 faltas'), iFalta);
assert.ok(iFalta.includes('Confirmar esses clientes na véspera'), iFalta); // lembrete já ligado
// Não manda "ativar lembrete" pra quem já tem lembrete ligado (seria inventar recomendação).
const iFaltaSemLembrete = pickInsight({ ...baseInsight, noShow: 3, reminderMinutesBefore: 0 });
assert.ok(iFaltaSemLembrete.includes('Ativar o lembrete automático'), iFaltaSemLembrete);
// Falta barata (abaixo do piso de R$ 100) não vira insight.
assert.ok(!pickInsight({ ...baseInsight, noShow: 1, ticketCents: 500 }).includes('perdeu'));

// 3ª: horário que esgota.
const iCheia = pickInsight({ ...baseInsight, dayparts: [cheia] });
assert.ok(iCheia.startsWith('Sábado à tarde lotou (95%'), iCheia);

// 4ª: crescimento.
assert.equal(
  pickInsight({ ...baseInsight, deltaPct: 25 }),
  'Faturamento subiu 25% vs a semana passada. Bom ritmo.',
);

// 5ª: fallback - sempre entrega algo, mesmo sem nenhuma regra disparar.
assert.equal(
  norm(pickInsight(baseInsight)),
  'Você atendeu 10 clientes e faturou R$ 800 essa semana.',
);
// Singular/plural.
assert.ok(pickInsight({ ...baseInsight, attended: 1 }).includes('1 cliente e'));

console.log('weekly-report: OK');
