import type { AddonTier, PlanTier, PrismaClient } from '@prisma/client';

/**
 * Valores iniciais do catálogo (preços em centavos; anual à vista = 10x o mensal =
 * "2 meses grátis"; anual 12x com taxas repassadas ao cliente). Isto é só o PONTO DE
 * PARTIDA - o catálogo é dinâmico no banco e pode ser editado depois (db:studio) sem
 * deploy. Os `seed*` são idempotentes (upsert por tier), então rodam em produção sem
 * duplicar. Fonte da verdade dos números: doc de pricing consolidado (jul/2026).
 *
 * Enterprise = "sob consulta": preço 0 (custom) e limites null (ilimitado).
 *
 * NB: os nomes de produto (Solo/Time/Multi) são o `name`; o enum PlanTier
 * (ESSENCIAL/PROFISSIONAL/NEGOCIO) é interno e não muda (evita migração de enum).
 */
interface PlanSeed {
  tier: PlanTier;
  name: string;
  priceMonthlyCents: number;
  priceAnnualCents: number;
  priceAnnualInstallmentCents: number;
  appointmentsPerMonth: number | null;
  /// IA saiu do plano base e virou addon (ver ADDON_PLAN_SEED). Sempre null aqui.
  aiMessagesPerMonth: number | null;
  maxProfessionals: number | null;
  maxReceptionists: number | null;
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
    priceAnnualCents: 69000,
    priceAnnualInstallmentCents: 6115,
    appointmentsPerMonth: 250,
    aiMessagesPerMonth: null,
    maxProfessionals: 1,
    maxReceptionists: 0,
    onlinePayments: false,
    webhooks: false,
    team: false,
    displayOrder: 1,
  },
  {
    tier: 'PROFISSIONAL',
    name: 'Time',
    priceMonthlyCents: 22000,
    priceAnnualCents: 220000,
    priceAnnualInstallmentCents: 19508,
    appointmentsPerMonth: 1000,
    aiMessagesPerMonth: null,
    maxProfessionals: 5,
    maxReceptionists: 2,
    onlinePayments: true,
    webhooks: true,
    team: true,
    displayOrder: 2,
  },
  {
    tier: 'NEGOCIO',
    name: 'Multi',
    priceMonthlyCents: 55000,
    priceAnnualCents: 550000,
    priceAnnualInstallmentCents: 48770,
    appointmentsPerMonth: 2500,
    aiMessagesPerMonth: null,
    maxProfessionals: null,
    maxReceptionists: null,
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
    priceAnnualInstallmentCents: 0,
    appointmentsPerMonth: null,
    aiMessagesPerMonth: null,
    maxProfessionals: null,
    maxReceptionists: null,
    onlinePayments: true,
    webhooks: true,
    team: true,
    displayOrder: 4,
  },
];

/**
 * Catálogo do addon "Atendente IA no WhatsApp" - tetos de conversa próprios,
 * independentes do plano base. Setup R$1.497 sempre cobrado. O addon acompanha o
 * CICLO do plano base na ativação (ver activateAddon), então precisa de preço em todos
 * os ciclos: anual à vista = 10× o mensal ("2 meses grátis", igual ao base) e 12x =
 * 12× o mensal (sem desconto). Editável no catálogo depois (admin) sem deploy.
 */
interface AddonPlanSeed {
  tier: AddonTier;
  name: string;
  priceMonthlyCents: number;
  priceAnnualCents: number;
  priceAnnualInstallmentCents: number;
  setupFeeCents: number;
  conversationsPerMonth: number | null;
  displayOrder: number;
}

/** Setup do addon: R$1.497, universal e nunca perdoado. */
const ADDON_SETUP_FEE_CENTS = 149700;

export const ADDON_PLAN_SEED: AddonPlanSeed[] = [
  {
    tier: 'BOT_SOLO',
    name: 'Bot Solo',
    priceMonthlyCents: 9900,
    priceAnnualCents: 99000,
    priceAnnualInstallmentCents: 9900,
    setupFeeCents: ADDON_SETUP_FEE_CENTS,
    conversationsPerMonth: 500,
    displayOrder: 1,
  },
  {
    tier: 'BOT_TIME',
    name: 'Bot Time',
    priceMonthlyCents: 24900,
    priceAnnualCents: 249000,
    priceAnnualInstallmentCents: 24900,
    setupFeeCents: ADDON_SETUP_FEE_CENTS,
    conversationsPerMonth: 2000,
    displayOrder: 2,
  },
  {
    tier: 'BOT_MULTI',
    name: 'Bot Multi',
    priceMonthlyCents: 59900,
    priceAnnualCents: 599000,
    priceAnnualInstallmentCents: 59900,
    setupFeeCents: ADDON_SETUP_FEE_CENTS,
    conversationsPerMonth: 5000,
    displayOrder: 3,
  },
];

/** Popula/atualiza a tabela `Plan` com os valores iniciais (idempotente por tier). */
export async function seedPlans(prisma: PrismaClient): Promise<void> {
  for (const plan of PLAN_SEED) {
    await prisma.plan.upsert({ where: { tier: plan.tier }, update: plan, create: plan });
  }
}

/** Popula/atualiza a tabela `AddonPlan` com os valores iniciais (idempotente por tier). */
export async function seedAddonPlans(prisma: PrismaClient): Promise<void> {
  for (const addon of ADDON_PLAN_SEED) {
    await prisma.addonPlan.upsert({ where: { tier: addon.tier }, update: addon, create: addon });
  }
}
