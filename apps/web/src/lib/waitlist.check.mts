/**
 * Self-check da lógica pura da fila de espera. Sem framework: roda com
 *   node --experimental-strip-types apps/web/src/lib/waitlist.check.mts
 * Falha (exit 1) se a matemática de onda / elegibilidade / data quebrar.
 */
import assert from 'node:assert/strict';

import { dateStrOf, dbDate, dayLabel, evaluateEligibility, nextWave } from './waitlist-core.ts';

// --- Round-trip da data (@db.Date <-> "YYYY-MM-DD") ---
assert.equal(dateStrOf(dbDate('2026-07-11')), '2026-07-11');
assert.equal(dbDate('2026-07-11').toISOString(), '2026-07-11T00:00:00.000Z');
assert.equal(dateStrOf(new Date('2026-07-11T00:00:00.000Z')), '2026-07-11');

// --- Rótulo do dia: meio-dia UTC não deve virar o dia no fuso BR (UTC-3) ---
assert.ok(dayLabel('2026-07-11', 'America/Sao_Paulo').includes('11/07'));

// --- Ondas ---
const fila = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }];
assert.deepEqual(nextWave(fila, [], 3, false).map((e) => e.id), ['a', 'b', 'c']); // onda 1
assert.deepEqual(nextWave(fila, ['a', 'b', 'c'], 3, false).map((e) => e.id), ['d', 'e']); // onda 2
assert.deepEqual(nextWave(fila, ['a', 'b', 'c', 'd', 'e'], 3, false), []); // esgotou
assert.deepEqual(nextWave(fila, [], 3, true).map((e) => e.id), ['a', 'b', 'c', 'd', 'e']); // todos de uma vez
assert.deepEqual(nextWave(fila, ['a'], 3, false).map((e) => e.id), ['b', 'c', 'd']); // pula notificado, pega 3

// --- Elegibilidade (dia lotado + expediente aberto + dentro da janela) ---
const ok = {
  waitlistEnabled: true,
  past: false,
  beyondHorizon: false,
  worksThatDay: true,
  expedienteOver: false,
  hasFreeSlot: false,
};
assert.deepEqual(evaluateEligibility(ok), { eligible: true });
assert.equal(evaluateEligibility({ ...ok, hasFreeSlot: true }).eligible, false); // ainda tem horário → agenda direto
assert.equal(evaluateEligibility({ ...ok, worksThatDay: false }).eligible, false); // não atende no dia
assert.equal(evaluateEligibility({ ...ok, expedienteOver: true }).eligible, false); // expediente encerrado
assert.equal(evaluateEligibility({ ...ok, past: true }).eligible, false); // dia passado
// waitlistEnabled=false vence tudo (1ª checagem), mesmo com o resto elegível.
const off = evaluateEligibility({ ...ok, waitlistEnabled: false, hasFreeSlot: true });
assert.equal(off.eligible, false);
assert.ok(!off.eligible && off.reason.includes('indisponível'));

console.log('waitlist self-check OK');
