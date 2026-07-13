/**
 * Prova a race de gasto-duplo no consumo de crédito de assinatura. Sem framework; roda
 * contra o Postgres LOCAL:
 *   cd apps/web && ../bot/node_modules/.bin/tsx --env-file=.env src/lib/memberships/credit-consume.check.mts
 *
 * Cliente com 1 crédito. N reservas COBERTAS simultâneas, em HORÁRIOS DIFERENTES (o advisory
 * lock do insert é por profissional+horário e NÃO as serializa - correm de fato). A guarda do
 * crédito é o UPDATE condicional (WHERE creditBalance >= cost). Sem ela (findUnique(saldo) +
 * update(decrement) separados), todas leem saldo=1 e todas descontam -> saldo negativo e N
 * agendamentos "cobertos" (crédito vendido de graça). Com a guarda, exatamente 1 desconta e as
 * outras caem pra avulso.
 *
 * Descobre um tenant/profissional/serviço/contato reais do seed; cria uma Membership descartável
 * com 1 crédito; usa slots no futuro distante; limpa tudo no fim (inclusive falhando).
 */
import assert from 'node:assert/strict';

import { prisma } from '@haru/database';

import { insertAppointmentGuarded } from '../appointment-insert.ts';

const N = 6;

const tenant = await prisma.tenant.findFirst({
  where: { users: { some: {} }, services: { some: { active: true } }, contacts: { some: {} } },
  select: {
    id: true,
    users: { select: { id: true }, take: 1 },
    services: { where: { active: true }, select: { id: true, durationMinutes: true }, take: 1 },
    contacts: { select: { id: true }, take: 1 },
  },
});
assert.ok(
  tenant?.users[0] && tenant.services[0] && tenant.contacts[0],
  'Precisa de um tenant com user + serviço ativo + contato no banco local (rode o seed).',
);

const tenantId = tenant.id;
const professionalId = tenant.users[0]!.id;
const serviceId = tenant.services[0]!.id;
const contactId = tenant.contacts[0]!.id;
const durationMinutes = tenant.services[0]!.durationMinutes;

// Slots bem espaçados (1 dia entre eles) no futuro distante: sem conflito entre si nem com a
// agenda real, então TODAS as N criações passam pelo consumo de crédito de fato.
const slots = Array.from({ length: N }, (_, i) => {
  const startsAt = new Date(Date.UTC(2031, 0, 1 + i, 13, 0, 0));
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
  return { startsAt, endsAt };
});

// --- Fixtures descartáveis ---------------------------------------------------
const stamp = Date.now();
const account = await prisma.customerAccount.create({
  data: {
    authId: `check-credit-${stamp}`,
    email: `check-credit-${stamp}@check.local`,
    name: 'Check Crédito',
  },
  select: { id: true },
});
const plan = await prisma.membershipPlan.create({
  data: {
    tenantId,
    name: 'Check Clube',
    priceCents: 15000,
    creditsPerCycle: 1,
    services: { create: [{ serviceId, creditCost: 1 }] },
  },
  select: { id: true },
});
const membership = await prisma.membership.create({
  data: {
    tenantId,
    planId: plan.id,
    customerAccountId: account.id,
    status: 'ACTIVE',
    planName: 'Check Clube',
    priceCents: 15000,
    creditsPerCycle: 1,
    creditBalance: 1, // <-- UM crédito
    currentPeriodStart: new Date(Date.UTC(2030, 11, 1)),
    currentPeriodEnd: new Date(Date.UTC(2035, 0, 1)),
    provider: 'ASAAS',
  },
  select: { id: true },
});

async function cleanup() {
  await prisma.appointment.deleteMany({ where: { tenantId, professionalId, membershipId: membership.id } });
  for (const s of slots) {
    await prisma.appointment.deleteMany({ where: { tenantId, professionalId, startsAt: s.startsAt } });
  }
  await prisma.membership.delete({ where: { id: membership.id } }).catch(() => {}); // cascata: ledger
  await prisma.membershipPlan.delete({ where: { id: plan.id } }).catch(() => {}); // cascata: planService
  await prisma.customerAccount.delete({ where: { id: account.id } }).catch(() => {});
}

let results;
try {
  // Dispara N criações COBERTAS concorrentes, horários diferentes, mesma Membership.
  results = await Promise.all(
    slots.map((s) =>
      insertAppointmentGuarded({
        tenantId,
        contactId,
        serviceId,
        professionalId,
        startsAt: s.startsAt,
        endsAt: s.endsAt,
        status: 'CONFIRMED',
        fromWaitlist: false,
        credit: { membershipId: membership.id, creditCost: 1 },
      }),
    ),
  );
} catch (e) {
  await cleanup();
  await prisma.$disconnect();
  throw e;
}

const created = results.filter((r) => 'appointmentId' in r).length;
const covered = results.filter((r) => 'appointmentId' in r && r.coveredBySubscription).length;
const redeems = await prisma.membershipCreditLedger.count({
  where: { membershipId: membership.id, reason: 'REDEEM' },
});
const balance = (await prisma.membership.findUniqueOrThrow({
  where: { id: membership.id },
  select: { creditBalance: true },
})).creditBalance;
const apptsCovered = await prisma.appointment.count({
  where: { tenantId, membershipId: membership.id },
});

console.log(
  `concorrentes=${N} · criados=${created} · cobertos(retorno)=${covered} · REDEEMs=${redeems} · saldo=${balance} · appts_com_membership=${apptsCovered}`,
);

await cleanup();
await prisma.$disconnect();

assert.equal(created, N, `Esperado ${N} agendamentos criados (slots distintos); vieram ${created}.`);
assert.equal(covered, 1, `GASTO-DUPLO: ${covered} reservas cobertas (esperado 1).`);
assert.equal(redeems, 1, `GASTO-DUPLO: ${redeems} linhas REDEEM no ledger (esperado 1).`);
assert.equal(balance, 0, `Saldo final ${balance} (esperado 0). Negativo = crédito vendido de graça.`);
assert.equal(apptsCovered, 1, `${apptsCovered} agendamentos com membershipId (esperado 1).`);
console.log('OK: exatamente 1 crédito consumido sob concorrência; resto avulso.');
