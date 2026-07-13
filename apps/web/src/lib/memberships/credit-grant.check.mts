/**
 * Self-check PURO da regra de recarga de créditos (acúmulo/teto/reset). Sem banco:
 *   cd apps/web && ../bot/node_modules/.bin/tsx src/lib/memberships/credit-grant.check.mts
 */
import assert from 'node:assert/strict';

import { computeGrant } from './credit-grant.ts';

// Invariante geral: newBalance == currentBalance + grantDelta + expiredDelta.
const inv = (cur: number, g: ReturnType<typeof computeGrant>) =>
  assert.equal(g.newBalance, cur + g.grantDelta + g.expiredDelta, 'ledger fecha com o cache');

// --- Sem rollover (vence): reseta pra creditsPerCycle, expira o resto ---------
{
  const g = computeGrant(0, 4, false, null); // 1º ciclo, saldo 0
  assert.deepEqual(g, { expiredDelta: 0, grantDelta: 4, newBalance: 4 });
  inv(0, g);
}
{
  const g = computeGrant(2, 4, false, null); // sobraram 2 -> expiram, volta a 4
  assert.deepEqual(g, { expiredDelta: -2, grantDelta: 4, newBalance: 4 });
  inv(2, g);
}

// --- Com rollover, sem teto: acumula ------------------------------------------
{
  const g = computeGrant(3, 4, true, null); // 3 + 4 = 7
  assert.deepEqual(g, { expiredDelta: 0, grantDelta: 4, newBalance: 7 });
  inv(3, g);
}

// --- Com rollover + teto: limita no teto --------------------------------------
{
  const g = computeGrant(6, 4, true, 8); // 6 + 4 = 10, teto 8 -> concede só 2
  assert.deepEqual(g, { expiredDelta: 0, grantDelta: 2, newBalance: 8 });
  inv(6, g);
}
{
  const g = computeGrant(8, 4, true, 8); // já no teto -> concede 0
  assert.deepEqual(g, { expiredDelta: 0, grantDelta: 0, newBalance: 8 });
  inv(8, g);
}
{
  // Saldo acima do teto (não deveria ocorrer, mas defensivo): não concede, não passa do teto.
  const g = computeGrant(10, 4, true, 8);
  assert.equal(g.grantDelta, 0);
  assert.ok(g.newBalance <= 10);
}

console.log('✓ credit-grant selfcheck: reset/expira, acúmulo e teto OK');
