// Self-check do cálculo de comissão (parte pura). Roda com:
//   tsx apps/web/src/lib/commission-core.test.ts

import assert from 'node:assert/strict';

import {
  computeCommission,
  summarizeCommissions,
  type CompensationConfig,
} from './commission-core';

const cfg = (
  o: Partial<CompensationConfig> & Pick<CompensationConfig, 'model'>,
): CompensationConfig => ({
  commissionPercent: null,
  fixedPerServiceCents: null,
  chairRentCents: null,
  ...o,
});

// ── Percentual por serviço ──────────────────────────────────────────────────────
const pct = computeCommission(
  cfg({ model: 'COMMISSION_PERCENT', commissionPercent: 50 }),
  10_000,
  4,
);
assert.equal(pct.professionalCents, 5_000); // 50% de R$100
assert.equal(pct.houseCents, 5_000);
assert.equal(pct.settlement.direction, 'PAY'); // casa paga o pro
assert.equal(pct.settlement.cents, 5_000);
assert.equal(pct.configured, true);
// % fora de faixa é clampado.
assert.equal(
  computeCommission(cfg({ model: 'COMMISSION_PERCENT', commissionPercent: 150 }), 10_000, 1)
    .professionalCents,
  10_000,
);
assert.equal(
  computeCommission(cfg({ model: 'COMMISSION_PERCENT', commissionPercent: -10 }), 10_000, 1)
    .professionalCents,
  0,
);

// ── Valor fixo por atendimento ──────────────────────────────────────────────────
const fix = computeCommission(
  cfg({ model: 'FIXED_PER_SERVICE', fixedPerServiceCents: 3_000 }),
  10_000,
  4,
);
assert.equal(fix.professionalCents, 12_000); // R$30 x 4 atendimentos
assert.equal(fix.houseCents, -2_000); // fixo passou do bruto: casa no vermelho neste pro (honesto)
assert.equal(fix.settlement.direction, 'PAY');
assert.equal(fix.settlement.cents, 12_000);

// ── Aluguel de cadeira (fluxo invertido) ────────────────────────────────────────
const rent = computeCommission(cfg({ model: 'CHAIR_RENT', chairRentCents: 80_000 }), 60_000, 20);
assert.equal(rent.professionalCents, 60_000); // pro fica com 100% do serviço
assert.equal(rent.houseCents, 80_000); // casa recebe o aluguel (não o serviço)
assert.equal(rent.settlement.direction, 'RECEIVE'); // casa RECEBE do pro
assert.equal(rent.settlement.cents, 80_000);

// ── Não configurado ─────────────────────────────────────────────────────────────
const none = computeCommission(null, 10_000, 3);
assert.equal(none.configured, false);
assert.equal(none.professionalCents, 0);
assert.equal(none.houseCents, 10_000);
assert.equal(none.settlement.direction, 'NONE');

// ── Consolidação do fechamento ──────────────────────────────────────────────────
const totals = summarizeCommissions([pct, fix, rent, none]);
assert.equal(totals.revenueCents, 10_000 + 10_000 + 60_000 + 10_000); // bruto de todos
assert.equal(totals.totalPayCents, 5_000 + 12_000); // percentual + fixo
assert.equal(totals.totalReceiveCents, 80_000); // aluguel
assert.equal(totals.netCents, 80_000 - 17_000); // recebe - paga

console.log('commission-core: OK');
