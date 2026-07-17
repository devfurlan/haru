// Self-check do núcleo puro do dashboard. Roda com:
//   tsx apps/web/src/lib/dashboard-core.test.ts
// Falha se as janelas por fuso, a tendência ou a escolha de destaques quebrarem.

import assert from 'node:assert/strict';

import { dashboardWindows, pickHighlights, trend } from './dashboard-core';

const TZ = 'America/Sao_Paulo'; // UTC-3, sem horário de verão desde 2019

// ── Janelas ────────────────────────────────────────────────────────────────────
// Quarta, 15/07/2026, 14:00 local = 17:00Z.
const now = new Date('2026-07-15T17:00:00.000Z');
const w = dashboardWindows(now, TZ);

// Dia de hoje no fuso do tenant: 00:00 local (03:00Z) -> 00:00 do dia seguinte.
assert.equal(w.todayStart.toISOString(), '2026-07-15T03:00:00.000Z');
assert.equal(w.todayEnd.toISOString(), '2026-07-16T03:00:00.000Z');

// Mesmo dia semana passada (08/07), mesmo horário = agora - 7 dias.
assert.equal(w.lastWeekDayStart.toISOString(), '2026-07-08T03:00:00.000Z');
assert.equal(w.lastWeekPoint.toISOString(), '2026-07-08T17:00:00.000Z');

// Semana corrente começa segunda 13/07 00:00 local (03:00Z).
assert.equal(w.weekStart.toISOString(), '2026-07-13T03:00:00.000Z');
assert.equal(w.prevWeekStart.toISOString(), '2026-07-06T03:00:00.000Z');
// prevWeekPoint = prevWeekStart + tempo decorrido na semana (seg 03:00Z -> qua 17:00Z = 2d14h).
assert.equal(
  w.prevWeekPoint.getTime() - w.prevWeekStart.getTime(),
  now.getTime() - w.weekStart.getTime(),
);
assert.equal(w.prevWeekPoint.toISOString(), '2026-07-08T17:00:00.000Z');

// Mês corrente começa dia 1 00:00 local (01/07 03:00Z); anterior = 01/06.
assert.equal(w.monthStart.toISOString(), '2026-07-01T03:00:00.000Z');
assert.equal(w.prevMonthStart.toISOString(), '2026-06-01T03:00:00.000Z');
assert.equal(
  w.prevMonthPoint.getTime() - w.prevMonthStart.getTime(),
  now.getTime() - w.monthStart.getTime(),
);

// Vira o ano: 01/01 -> mês anterior 01/12 do ano passado.
const wJan = dashboardWindows(new Date('2027-01-10T15:00:00.000Z'), TZ);
assert.equal(wJan.monthStart.toISOString(), '2027-01-01T03:00:00.000Z');
assert.equal(wJan.prevMonthStart.toISOString(), '2026-12-01T03:00:00.000Z');

// Domingo (dow=0) volta 6 dias pra segunda, não 1.
const wSun = dashboardWindows(new Date('2026-07-12T15:00:00.000Z'), TZ); // domingo
assert.equal(wSun.weekStart.toISOString(), '2026-07-06T03:00:00.000Z'); // segunda 06/07

// ── Tendência ────────────────────────────────────────────────────────────────
assert.deepEqual(trend(15000, 10000), { deltaCents: 5000, deltaPct: 50, dir: 'up' });
assert.deepEqual(trend(8000, 10000), { deltaCents: -2000, deltaPct: -20, dir: 'down' });
assert.deepEqual(trend(10000, 10000), { deltaCents: 0, deltaPct: 0, dir: 'flat' });
// Sem base (período anterior zerado): não inventa %.
assert.deepEqual(trend(12000, 0), { deltaCents: 12000, deltaPct: null, dir: 'up' });

// ── Destaques ──────────────────────────────────────────────────────────────────
// À frente da semana passada + agenda folgada = os dois de maior prioridade.
assert.deepEqual(
  pickHighlights({
    weekdayLabel: 'terça',
    todayRevenueCents: 20000,
    todayPrevRevenueCents: 15000,
    upcoming: 3,
    noShow: 0,
    occupancyPct: 40,
  }),
  [
    'Você está à frente da terça passada no mesmo horário.',
    'Agenda 60% livre hoje - ainda dá pra encaixar cliente.',
  ],
);

// Agenda folgada (upcoming>0, ocupação<60) entra quando não há os de cima.
const folga = pickHighlights({
  weekdayLabel: 'segunda',
  todayRevenueCents: 0,
  todayPrevRevenueCents: 0,
  upcoming: 4,
  noShow: 0,
  occupancyPct: 30,
});
assert.equal(folga[0], 'Agenda 70% livre hoje - ainda dá pra encaixar cliente.');

// Dia parado sem nada a dizer = lista vazia (não força destaque).
assert.deepEqual(
  pickHighlights({
    weekdayLabel: 'segunda',
    todayRevenueCents: 0,
    todayPrevRevenueCents: 0,
    upcoming: 0,
    noShow: 0,
    occupancyPct: 100,
  }),
  [],
);

// No máximo 2.
const cheio = pickHighlights({
  weekdayLabel: 'sábado',
  todayRevenueCents: 30000,
  todayPrevRevenueCents: 10000,
  upcoming: 5,
  noShow: 2,
  occupancyPct: 40,
});
assert.equal(cheio.length, 2);

console.log('dashboard-core: OK');
