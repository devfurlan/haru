/**
 * Self-check das partes NÃO-triviais do billing: seleção de preço por ciclo +
 * grandfather (snapshot) e os predicados de acesso (assinatura ativa, feature, addon,
 * over-limit, alertas). Sem DB: usa objetos falsos e um DATABASE_URL dummy (o client
 * do Prisma é lazy e nunca conecta aqui).
 *
 *   npx tsx packages/billing/src/selfcheck.ts
 */
import assert from 'node:assert/strict';

import type { AddonPlan, Plan, Subscription } from '@haru/database';

import { snapshotAddon, snapshotPlan } from './snapshot';

// gating importa o client do Prisma (precisa de DATABASE_URL só p/ construir, não
// conecta). Default dummy ANTES do import dinâmico p/ o self-check rodar em qualquer lugar.
process.env.DATABASE_URL ||= 'postgresql://selfcheck:selfcheck@localhost:5432/selfcheck';
const {
  isSubscriptionActive,
  isAddonActive,
  recurringValueCents,
  prorataCents,
  hasFeature,
  isOverLimit,
  alertLevel,
  cycleWindow,
  isFairUse,
  hasWaitlist,
  hasServiceSubscriptions,
} = await import('./gating');

// --- Preço por ciclo (money path) --------------------------------------------
const plan = {
  priceMonthlyCents: 7900,
  priceAnnualCents: 79000,
  priceAnnualInstallmentCents: 7001,
  whatsappRemindersPerMonth: 250,
  maxProfessionals: 1,
  maxReceptionists: 0,
  onlinePayments: false,
  webhooks: false,
  team: false,
  waitlist: false,
  serviceSubscriptions: false,
} as unknown as Plan;

assert.equal(snapshotPlan(plan, 'MONTHLY').priceCents, 7900);
assert.equal(snapshotPlan(plan, 'ANNUAL').priceCents, 79000);
assert.equal(snapshotPlan(plan, 'ANNUAL_INSTALLMENTS').priceCents, 7001);
assert.equal(snapshotPlan(plan, 'MONTHLY').whatsappRemindersLimit, 250); // única quota do base
// Features vêm do PLANO (não do tier) e entram no snapshot - base do gating de fila/clube.
assert.equal(snapshotPlan(plan, 'MONTHLY').featWaitlist, false);
assert.equal(snapshotPlan(plan, 'MONTHLY').featServiceSubscriptions, false);
assert.equal(
  snapshotPlan({ ...plan, waitlist: true } as unknown as Plan, 'MONTHLY').featWaitlist,
  true,
);

const addon = {
  priceMonthlyCents: 24900,
  priceAnnualCents: 0,
  priceAnnualInstallmentCents: 0,
  setupFeeCents: 149700,
  conversationsPerMonth: 2000,
} as unknown as AddonPlan;

assert.equal(snapshotAddon(addon, 'MONTHLY').addonPriceCents, 24900);
assert.equal(snapshotAddon(addon, 'MONTHLY').addonSetupFeeCents, 149700); // setup sempre
assert.equal(snapshotAddon(addon, 'MONTHLY').addonConversationsLimit, 2000);

// Grandfather: mudar o catálogo depois não muda um snapshot já tirado.
const snap = snapshotPlan(plan, 'MONTHLY');
(plan as { priceMonthlyCents: number }).priceMonthlyCents = 9900;
assert.equal(snap.priceCents, 7900);

// --- Predicados de acesso ----------------------------------------------------
const future = new Date(Date.now() + 86_400_000);
const past = new Date(Date.now() - 86_400_000);

const sub = (over: Partial<Subscription>): Subscription =>
  ({
    status: 'ACTIVE',
    currentPeriodEnd: future,
    featOnlinePayments: false,
    featWebhooks: false,
    featTeam: false,
    featWaitlist: false,
    featServiceSubscriptions: false,
    addonTier: null,
    addonActivatedAt: past, // addon "no ar" por default; casos com addonTier ficam ativos
    addonCanceledAt: null,
    addonConversationsLimit: null,
    ...over,
  }) as unknown as Subscription;

assert.equal(isSubscriptionActive(null), false);
assert.equal(isSubscriptionActive(sub({ status: 'ACTIVE' })), true);
assert.equal(isSubscriptionActive(sub({ status: 'PENDING' })), false);
assert.equal(isSubscriptionActive(sub({ status: 'SUSPENDED' })), false);
assert.equal(isSubscriptionActive(sub({ status: 'CANCELED', currentPeriodEnd: future })), true);
assert.equal(isSubscriptionActive(sub({ status: 'CANCELED', currentPeriodEnd: past })), false);

assert.equal(hasFeature(sub({ featOnlinePayments: true }), 'onlinePayments'), true);
assert.equal(hasFeature(sub({ featOnlinePayments: false }), 'onlinePayments'), false);
assert.equal(hasFeature(sub({ status: 'PENDING', featWebhooks: true }), 'webhooks'), false);

// Addon: independente do plano base; ativo com tier setado e sub ativa. Cancelamento
// vale "no fim do ciclo": segue ativo enquanto currentPeriodEnd (período pago) no futuro.
assert.equal(isAddonActive(sub({ addonTier: null })), false);
assert.equal(isAddonActive(sub({ addonTier: 'BOT_TIME' })), true);
assert.equal(isAddonActive(sub({ addonTier: 'BOT_TIME', addonCanceledAt: past })), true); // cancelado, ciclo em aberto
assert.equal(
  isAddonActive(sub({ addonTier: 'BOT_TIME', addonCanceledAt: past, currentPeriodEnd: past })),
  false,
); // cancelado e ciclo encerrado
assert.equal(isAddonActive(sub({ status: 'PENDING', addonTier: 'BOT_TIME' })), false);
// Escolhido mas ainda NÃO ativado (addonTier setado na escolha; setup/verificação pendente).
assert.equal(isAddonActive(sub({ addonTier: 'BOT_TIME', addonActivatedAt: null })), false);
assert.equal(hasFeature(sub({ addonTier: 'BOT_TIME' }), 'aiAttendant'), true);
assert.equal(hasFeature(sub({ addonTier: 'BOT_TIME', addonActivatedAt: null }), 'aiAttendant'), false);
assert.equal(hasFeature(sub({ addonTier: null }), 'aiAttendant'), false);

// --- Valor recorrente unificado: plano base + addon quando ativo -----------------
assert.equal(recurringValueCents(null), 0);
assert.equal(recurringValueCents(sub({ priceCents: 6900, addonTier: null })), 6900); // sem addon
assert.equal(
  recurringValueCents(sub({ priceCents: 6900, addonTier: 'BOT_TIME', addonPriceCents: 24900 })),
  6900 + 24900,
); // addon ativo soma
assert.equal(
  recurringValueCents(
    sub({ priceCents: 6900, addonTier: 'BOT_TIME', addonPriceCents: 24900, addonActivatedAt: null }),
  ),
  6900,
); // escolhido mas não ativado: não soma
assert.equal(
  recurringValueCents(sub({ status: 'PENDING', priceCents: 6900, addonTier: 'BOT_TIME', addonPriceCents: 24900 })),
  6900,
); // assinatura inativa: addon não conta

// --- Proporcional do 1º ciclo do addon (money path) ------------------------------
const win30 = {
  currentPeriodStart: new Date('2026-07-01T00:00:00Z'),
  currentPeriodEnd: new Date('2026-07-31T00:00:00Z'), // 30 dias
};
assert.equal(prorataCents(win30, 30000, new Date('2026-07-01T00:00:00Z')), 30000); // entrou no início -> cheio
assert.equal(prorataCents(win30, 30000, new Date('2026-07-16T00:00:00Z')), 15000); // metade do ciclo -> ~metade
assert.equal(prorataCents(win30, 30000, new Date('2026-07-31T00:00:00Z')), 0); // ciclo vencido -> nada
assert.equal(
  prorataCents({ currentPeriodStart: null, currentPeriodEnd: null }, 30000, new Date()),
  30000,
); // sem janela -> valor cheio

// --- Teto / alertas (regra dura: só sinaliza, quem bloqueia é a ação owner-side) --
assert.equal(isOverLimit({ used: 250, limit: 250, pct: 100 }), true);
assert.equal(isOverLimit({ used: 249, limit: 250, pct: 100 }), false);
assert.equal(isOverLimit({ used: 9999, limit: null, pct: null }), false); // ilimitado nunca bloqueia
assert.equal(alertLevel(null), 0);
assert.equal(alertLevel(84), 0);
assert.equal(alertLevel(85), 85);
assert.equal(alertLevel(92), 90);
assert.equal(alertLevel(100), 100);
assert.equal(alertLevel(130), 100);

// Nível terminal (100) só no over-limit REAL: 249/250 arredonda p/ 100% mas não estourou,
// então o alerta que sai é o de 95 (capado), não o terminal. Alinhado ao bloqueio owner-side.
const pct249 = Math.round((249 / 250) * 100); // 100 (arredondado)
assert.equal(isOverLimit({ used: 249, limit: 250, pct: pct249 }), false);
assert.equal(Math.min(alertLevel(pct249), 95), 95); // capa em 95: não dispara o terminal
assert.equal(isOverLimit({ used: 250, limit: 250, pct: 100 }), true); // aí sim, terminal

// --- Escada de lembretes WhatsApp (quota do plano base): 2 níveis, 80 e 100 -------
// Espelha a decisão inline de nextUsageAlerts: 100 no over-limit REAL; 80 a partir de 80%.
const remLevel = (used: number, limit: number) => {
  const m = { used, limit, pct: Math.round((used / limit) * 100) };
  return isOverLimit(m) ? 100 : m.pct >= 80 ? 80 : 0;
};
assert.equal(remLevel(198, 250), 0); // 79.2% -> ainda não alerta (pct arredondado = 79)
assert.equal(remLevel(200, 250), 80); // 80% -> alerta único ao dono
assert.equal(remLevel(249, 250), 80); // <100% segue 80, nunca terminal antes de esgotar
assert.equal(remLevel(250, 250), 100); // esgotou -> pausa só o canal WhatsApp

// --- Janela de cota por ciclo (reset por ciclo, teto mensal mesmo no anual) -------
const win = (startISO: string | null, nowISO: string) =>
  cycleWindow(
    (startISO
      ? { currentPeriodStart: new Date(startISO) }
      : { currentPeriodStart: null }) as unknown as Subscription,
    new Date(nowISO),
  );
const iso = (d: Date) => d.toISOString().slice(0, 10);

// Sem período: mês civil.
const civil = win(null, '2026-03-20T12:00:00Z');
assert.equal(iso(civil.gte), '2026-03-01');
assert.equal(iso(civil.lt), '2026-04-01');

// Ancorada no dia do ciclo (dia 15): janela mensal em torno de `now`.
const anniv = win('2026-01-15T00:00:00Z', '2026-03-20T12:00:00Z');
assert.equal(iso(anniv.gte), '2026-03-15');
assert.equal(iso(anniv.lt), '2026-04-15');

// `now` antes do dia-âncora do mês corrente: cai na janela anterior.
const before = win('2026-01-15T00:00:00Z', '2026-03-10T12:00:00Z');
assert.equal(iso(before.gte), '2026-02-15');
assert.equal(iso(before.lt), '2026-03-15');

// Dia 31 em mês curto: clamp para o último dia (fev/2026 = 28).
const clamp = win('2026-01-31T00:00:00Z', '2026-02-10T12:00:00Z');
assert.equal(iso(clamp.gte), '2026-01-31');
assert.equal(iso(clamp.lt), '2026-02-28');

// --- Fair use: só Multi (NEGOCIO) + addon Multi (BOT_MULTI) ativo ------------------
assert.equal(isFairUse(sub({ planTier: 'NEGOCIO', addonTier: 'BOT_MULTI' })), true);
assert.equal(isFairUse(sub({ planTier: 'NEGOCIO', addonTier: 'BOT_TIME' })), false);
assert.equal(isFairUse(sub({ planTier: 'PROFISSIONAL', addonTier: 'BOT_MULTI' })), false);
assert.equal(
  isFairUse(
    sub({
      planTier: 'NEGOCIO',
      addonTier: 'BOT_MULTI',
      addonCanceledAt: past,
      currentPeriodEnd: past,
    }),
  ),
  false,
); // addon encerrado => não é mais fair use

// --- Fila e clube: gate pela FLAG do snapshot, não pelo tier ------------------------
// É o que permite plano PERSONALIZADO combinar features livremente (ex.: tier Solo com fila).
const flagged = (flag: string, value: boolean, over: Partial<Subscription> = {}) =>
  sub({ ...over, [flag]: value } as Partial<Subscription>);

for (const [label, fn, flag] of [
  ['hasWaitlist', hasWaitlist, 'featWaitlist'],
  ['hasServiceSubscriptions', hasServiceSubscriptions, 'featServiceSubscriptions'],
] as const) {
  assert.equal(fn(null), false, `${label}: sem assinatura`);
  assert.equal(fn(flagged(flag, false)), false, `${label}: flag off não libera`);
  assert.equal(fn(flagged(flag, true)), true, `${label}: flag on libera`);
  // O caso que o gate por tier NÃO permitia: plano personalizado em tier Solo com a feature.
  assert.equal(
    fn(flagged(flag, true, { planTier: 'ESSENCIAL' })),
    true,
    `${label}: custom tier-Solo com a flag ligada libera`,
  );
  // E o inverso: tier alto sem a flag não libera (o tier não manda mais).
  assert.equal(
    fn(flagged(flag, false, { planTier: 'NEGOCIO' })),
    false,
    `${label}: tier Multi sem a flag não libera`,
  );
  assert.equal(
    fn(flagged(flag, true, { status: 'PENDING' })),
    false,
    `${label}: assinatura inativa não libera`,
  );
  // Cancelado mas dentro do período pago ainda mantém acesso.
  assert.equal(
    fn(flagged(flag, true, { status: 'CANCELED', currentPeriodEnd: future })),
    true,
    `${label}: cancelado no período pago segue`,
  );
}

console.log(
  '✓ billing selfcheck: preço por ciclo, grandfather, acesso, tetos, janela, fair use e ' +
    'features por flag (fila/clube, inclusive plano custom) OK',
);
