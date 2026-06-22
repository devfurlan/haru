import { prisma } from '../src/index.js';
import { seedPlans } from '../prisma/plans.js';

/**
 * Popula só o catálogo de planos (idempotente). Separado do seed principal para
 * poder rodar em produção sem criar o tenant/usuário de teste.
 *   pnpm --filter @haru/database seed:plans
 */
async function main() {
  await seedPlans(prisma);
  const plans = await prisma.plan.findMany({ orderBy: { displayOrder: 'asc' } });
  console.log('✓ Planos populados:');
  for (const p of plans) {
    console.log(
      `  ${p.tier.padEnd(12)} R$ ${(p.priceMonthlyCents / 100).toFixed(2).padStart(7)}/mês  ` +
        `agend.: ${p.appointmentsPerMonth ?? '∞'}  IA: ${p.aiMessagesPerMonth ?? '∞'}`,
    );
  }
}

main()
  .catch((err) => {
    console.error('[seed-plans] falhou:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
