import type { PlanTier, PrismaClient } from '@prisma/client';

/**
 * Valores iniciais do catálogo de planos (preços em centavos; anual ~20% off do
 * mensal). Isto é só o PONTO DE PARTIDA - os planos são dinâmicos no banco e
 * podem ser editados depois (db:studio) sem deploy. `seedPlans` é idempotente
 * (upsert por tier), então pode rodar em produção sem duplicar.
 *
 * Enterprise = "sob consulta": preço 0 (custom) e limites null (ilimitado).
 */
interface PlanSeed {
  tier: PlanTier;
  name: string;
  priceMonthlyCents: number;
  priceAnnualCents: number;
  appointmentsPerMonth: number | null;
  aiMessagesPerMonth: number | null;
  maxStaff: number | null;
  onlinePayments: boolean;
  webhooks: boolean;
  team: boolean;
  displayOrder: number;
}

export const PLAN_SEED: PlanSeed[] = [
  {
    tier: 'ESSENCIAL',
    name: 'Solo',
    priceMonthlyCents: 6900,
    priceAnnualCents: 66240,
    appointmentsPerMonth: 250,
    aiMessagesPerMonth: 1500,
    maxStaff: 1,
    onlinePayments: false,
    webhooks: false,
    team: false,
    displayOrder: 1,
  },
  {
    tier: 'PROFISSIONAL',
    name: 'Time',
    priceMonthlyCents: 14900,
    priceAnnualCents: 143040,
    appointmentsPerMonth: 1000,
    aiMessagesPerMonth: 7500,
    maxStaff: 5,
    onlinePayments: true,
    webhooks: true,
    team: true,
    displayOrder: 2,
  },
  {
    tier: 'NEGOCIO',
    name: 'Multi',
    priceMonthlyCents: 34900,
    priceAnnualCents: 335040,
    appointmentsPerMonth: 2500,
    aiMessagesPerMonth: 25000,
    maxStaff: null,
    onlinePayments: true,
    webhooks: true,
    team: true,
    displayOrder: 3,
  },
  {
    tier: 'ENTERPRISE',
    name: 'Custom',
    priceMonthlyCents: 0,
    priceAnnualCents: 0,
    appointmentsPerMonth: null,
    aiMessagesPerMonth: null,
    maxStaff: null,
    onlinePayments: true,
    webhooks: true,
    team: true,
    displayOrder: 4,
  },
];

/** Popula/atualiza a tabela `Plan` com os valores iniciais (idempotente por tier). */
export async function seedPlans(prisma: PrismaClient): Promise<void> {
  for (const plan of PLAN_SEED) {
    await prisma.plan.upsert({
      where: { tier: plan.tier },
      update: plan,
      create: plan,
    });
  }
}
