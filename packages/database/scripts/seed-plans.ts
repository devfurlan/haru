import { prisma } from '../src/index.js';
import { seedAddonPlans, seedPlans } from '../prisma/plans.js';

/**
 * Popula só o catálogo (planos base + addon), idempotente. Separado do seed
 * principal para poder rodar em produção sem criar o tenant/usuário de teste.
 *   pnpm --filter @haru/database seed:plans
 */
async function main() {
  await seedPlans(prisma);
  await seedAddonPlans(prisma);

  const plans = await prisma.plan.findMany({ orderBy: { displayOrder: 'asc' } });
  console.log('✓ Planos base:');
  for (const p of plans) {
    console.log(
      `  ${p.tier.padEnd(12)} R$ ${(p.priceMonthlyCents / 100).toFixed(2).padStart(7)}/mês  ` +
        `lembretes WA: ${p.whatsappRemindersPerMonth ?? '∞'}`,
    );
  }

  const addons = await prisma.addonPlan.findMany({ orderBy: { displayOrder: 'asc' } });
  console.log('✓ Addon "Atendente IA no WhatsApp":');
  for (const a of addons) {
    console.log(
      `  ${a.tier.padEnd(10)} +R$ ${(a.priceMonthlyCents / 100).toFixed(2).padStart(7)}/mês  ` +
        `conversas: ${a.conversationsPerMonth ?? '∞'}  setup: R$ ${(a.setupFeeCents / 100).toFixed(2)}`,
    );
  }
}

main()
  .catch((err) => {
    console.error('[seed-plans] falhou:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
