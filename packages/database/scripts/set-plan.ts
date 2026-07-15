import type { BillingCycle, PlanTier } from '@prisma/client';

import { prisma } from '../src/index.js';

/**
 * Ativa manualmente a assinatura de um tenant (onboarding concierge dos primeiros
 * clientes, antes do checkout self-serve da Fase 2). Lê o `Plan`, grava o SNAPSHOT dos
 * termos na `Subscription` e marca como ACTIVE.
 *
 * O 2º argumento aceita um TIER (resolve o plano PÚBLICO daquele tier) ou o ID de um plano
 * específico - inclusive PERSONALIZADO (active: false, criado no admin). Não importa
 * `@haru/billing` (getPublicPlan) porque billing depende de database: seria ciclo.
 *
 * Uso (a partir de packages/database):
 *   dotenv -e .env -- tsx scripts/set-plan.ts <slug> <TIER|planId> [monthly|annual]
 * ou:
 *   pnpm --filter @haru/database set-plan <slug> <TIER|planId> [monthly|annual]
 */

const VALID_TIERS: PlanTier[] = ['ESSENCIAL', 'PROFISSIONAL', 'NEGOCIO', 'ENTERPRISE'];

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

async function main() {
  const [slug, planArg, cycleArg = 'monthly'] = process.argv.slice(2);

  if (!slug || !planArg) {
    console.error(
      'Uso: set-plan <slug> <ESSENCIAL|PROFISSIONAL|NEGOCIO|ENTERPRISE|planId> [monthly|annual]',
    );
    process.exit(1);
  }

  const cycle: BillingCycle = cycleArg.toLowerCase() === 'annual' ? 'ANNUAL' : 'MONTHLY';

  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) {
    console.error(`Tenant não encontrado pelo slug "${slug}".`);
    process.exit(1);
  }

  // Tier -> plano PÚBLICO daquele tier; senão trata o argumento como id de plano
  // (permite atribuir um plano PERSONALIZADO criado no admin).
  const maybeTier = planArg.toUpperCase() as PlanTier;
  const isTier = VALID_TIERS.includes(maybeTier);
  const plan = isTier
    ? await prisma.plan.findFirst({ where: { tier: maybeTier, active: true } })
    : await prisma.plan.findUnique({ where: { id: planArg } });

  if (!plan) {
    console.error(
      isTier
        ? `Não há plano público para o tier ${maybeTier}. Rode o seed (seed:plans) ou passe o id de um plano personalizado.`
        : `Plano não encontrado pelo id "${planArg}".`,
    );
    process.exit(1);
  }

  const now = new Date();
  const periodEnd = cycle === 'ANNUAL' ? addMonths(now, 12) : addMonths(now, 1);

  // Snapshot dos termos do Plan vigente (grandfather: editar o Plan depois não muda isto).
  const snapshot = {
    priceCents: cycle === 'ANNUAL' ? plan.priceAnnualCents : plan.priceMonthlyCents,
    whatsappRemindersLimit: plan.whatsappRemindersPerMonth,
    maxProfessionals: plan.maxProfessionals,
    maxReceptionists: plan.maxReceptionists,
    featOnlinePayments: plan.onlinePayments,
    featWebhooks: plan.webhooks,
    featTeam: plan.team,
    featWaitlist: plan.waitlist,
    featServiceSubscriptions: plan.serviceSubscriptions,
  };

  const sub = await prisma.subscription.upsert({
    where: { tenantId: tenant.id },
    update: {
      planTier: plan.tier,
      planId: plan.id,
      status: 'ACTIVE',
      billingCycle: cycle,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      guaranteeUntil: addDays(now, 30),
      canceledAt: null,
      ...snapshot,
    },
    create: {
      tenantId: tenant.id,
      planTier: plan.tier,
      planId: plan.id,
      status: 'ACTIVE',
      billingCycle: cycle,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      guaranteeUntil: addDays(now, 30),
      ...snapshot,
    },
  });

  console.log(
    `✓ ${tenant.name} (${slug}) → ${plan.name} [${plan.tier}${plan.active ? '' : ', personalizado'}] ` +
      `${cycle} ATIVO (R$ ${(sub.priceCents / 100).toFixed(2)}, ` +
      `lembretes WhatsApp: ${sub.whatsappRemindersLimit ?? '∞'}, ` +
      `fila: ${sub.featWaitlist ? 'sim' : 'não'}, clube: ${sub.featServiceSubscriptions ? 'sim' : 'não'}, ` +
      `garantia até ${sub.guaranteeUntil?.toISOString().slice(0, 10)})`,
  );
}

main()
  .catch((err) => {
    console.error('[set-plan] falhou:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
