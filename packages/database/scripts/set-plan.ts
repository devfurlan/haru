import type { BillingCycle, PlanTier } from '@prisma/client';

import { prisma } from '../src/index.js';

/**
 * Ativa manualmente a assinatura de um tenant (onboarding concierge dos primeiros
 * clientes, antes do checkout self-serve da Fase 2). Lê o `Plan` vigente, grava o
 * SNAPSHOT dos termos na `Subscription` e marca como ACTIVE.
 *
 * Uso (a partir de packages/database):
 *   dotenv -e .env -- tsx scripts/set-plan.ts <slug> <TIER> [monthly|annual]
 * ou:
 *   pnpm --filter @haru/database set-plan <slug> <TIER> [monthly|annual]
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
  const [slug, tierArg, cycleArg = 'monthly'] = process.argv.slice(2);

  if (!slug || !tierArg) {
    console.error(
      'Uso: set-plan <slug> <ESSENCIAL|PROFISSIONAL|NEGOCIO|ENTERPRISE> [monthly|annual]',
    );
    process.exit(1);
  }

  const tier = tierArg.toUpperCase() as PlanTier;
  if (!VALID_TIERS.includes(tier)) {
    console.error(`Tier inválido: "${tierArg}". Use um de: ${VALID_TIERS.join(', ')}`);
    process.exit(1);
  }

  const cycle: BillingCycle = cycleArg.toLowerCase() === 'annual' ? 'ANNUAL' : 'MONTHLY';

  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) {
    console.error(`Tenant não encontrado pelo slug "${slug}".`);
    process.exit(1);
  }

  const plan = await prisma.plan.findUnique({ where: { tier } });
  if (!plan) {
    console.error(`Plano ${tier} não existe. Rode o seed primeiro (pnpm --filter @haru/database seed).`);
    process.exit(1);
  }

  const now = new Date();
  const periodEnd = cycle === 'ANNUAL' ? addMonths(now, 12) : addMonths(now, 1);

  // Snapshot dos termos do Plan vigente (grandfather: editar o Plan depois não muda isto).
  const snapshot = {
    priceCents: cycle === 'ANNUAL' ? plan.priceAnnualCents : plan.priceMonthlyCents,
    appointmentsLimit: plan.appointmentsPerMonth,
    aiMessagesLimit: plan.aiMessagesPerMonth,
    maxStaff: plan.maxStaff,
    featOnlinePayments: plan.onlinePayments,
    featWebhooks: plan.webhooks,
    featTeam: plan.team,
  };

  const sub = await prisma.subscription.upsert({
    where: { tenantId: tenant.id },
    update: {
      planTier: tier,
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
      planTier: tier,
      status: 'ACTIVE',
      billingCycle: cycle,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      guaranteeUntil: addDays(now, 30),
      ...snapshot,
    },
  });

  console.log(
    `✓ ${tenant.name} (${slug}) → ${tier} ${cycle} ATIVO ` +
      `(R$ ${(sub.priceCents / 100).toFixed(2)}, ` +
      `agend.: ${sub.appointmentsLimit ?? '∞'}, IA: ${sub.aiMessagesLimit ?? '∞'}, ` +
      `garantia até ${sub.guaranteeUntil?.toISOString().slice(0, 10)})`,
  );
}

main()
  .catch((err) => {
    console.error('[set-plan] falhou:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
