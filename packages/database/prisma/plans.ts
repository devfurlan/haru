import type { AddonTier, PlanTier, PrismaClient } from '@prisma/client';

/**
 * Valores iniciais do catálogo PÚBLICO (preços em centavos; anual à vista = 10x o mensal =
 * "2 meses grátis"; anual 12x com taxas repassadas ao cliente). Isto é só o PONTO DE
 * PARTIDA - o catálogo é dinâmico no banco e pode ser editado depois (admin/db:studio) sem
 * deploy. Os `seed*` são idempotentes, então rodam em produção sem duplicar. Fonte da
 * verdade dos números: doc de pricing consolidado (jul/2026).
 *
 * O seed é dono APENAS dos planos públicos (active: true, um por tier). Planos
 * PERSONALIZADOS (active: false) são criados no admin e atribuídos a estabelecimentos
 * específicos - o seed nunca os toca. Enterprise não tem linha aqui: é "sob consulta"
 * (copy estática no site) e cada deal vira um plano personalizado.
 *
 * NB: agendamentos são ILIMITADOS em todos os planos - a única quota do plano base é
 * `whatsappRemindersPerMonth` (lembretes por WhatsApp). As features (fila, clube,
 * pagamentos, webhooks, equipe) são flags POR PLANO, fotografadas na Subscription: o tier
 * é só o rótulo comercial. Os nomes de produto (Solo/Time/Multi) são o `name`; o enum
 * PlanTier (ESSENCIAL/PROFISSIONAL/NEGOCIO/ENTERPRISE) é interno e não muda.
 */
interface PlanSeed {
  tier: PlanTier;
  name: string;
  priceMonthlyCents: number;
  priceAnnualCents: number;
  priceAnnualInstallmentCents: number;
  whatsappRemindersPerMonth: number | null;
  maxProfessionals: number | null;
  maxReceptionists: number | null;
  onlinePayments: boolean;
  webhooks: boolean;
  team: boolean;
  waitlist: boolean;
  serviceSubscriptions: boolean;
  /// true = plano PÚBLICO (listado em /precos + contratável no self-serve). Só um por tier.
  active: boolean;
  displayOrder: number;
}

// Anual à vista = 10× o mensal ("2 meses grátis"). priceAnnualInstallmentCents = valor de
// cada parcela do anual 12x no cartão. ponytail: recalculado mantendo a mesma margem de
// parcelamento implícita de hoje (~6% sobre o anual à vista); trocar pelos valores reais da
// tabela do gateway quando disponíveis.
export const PLAN_SEED: PlanSeed[] = [
  {
    tier: 'ESSENCIAL',
    name: 'Solo',
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
    active: true,
    displayOrder: 1,
  },
  {
    tier: 'PROFISSIONAL',
    name: 'Time',
    priceMonthlyCents: 12900,
    priceAnnualCents: 129000,
    priceAnnualInstallmentCents: 11395,
    whatsappRemindersPerMonth: 900,
    maxProfessionals: 6,
    maxReceptionists: 2,
    onlinePayments: true,
    webhooks: true,
    team: true,
    waitlist: true,
    serviceSubscriptions: true,
    active: true,
    displayOrder: 2,
  },
  {
    tier: 'NEGOCIO',
    name: 'Multi',
    priceMonthlyCents: 19900,
    priceAnnualCents: 199000,
    priceAnnualInstallmentCents: 17646,
    whatsappRemindersPerMonth: 2200,
    maxProfessionals: 15,
    maxReceptionists: null,
    onlinePayments: true,
    webhooks: true,
    team: true,
    waitlist: true,
    serviceSubscriptions: true,
    active: true,
    displayOrder: 3,
  },
];
// NB: Enterprise NÃO tem linha no seed. É "sob consulta": o site comunica por copy estática
// (banner da /precos) e cada negociação vira um PLANO PERSONALIZADO criado no admin
// (active: false, preço/limites/features próprios) e atribuído ao estabelecimento.

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

/**
 * Popula/atualiza os planos PÚBLICOS (idempotente). O seed é dono só do catálogo público:
 * identifica cada plano pelo par (tier, active), que o índice parcial `Plan_tier_active_key`
 * garante ser único. Planos PERSONALIZADOS (active: false, criados no admin) nunca são
 * tocados aqui. Não dá pra usar `upsert({ where: { tier } })`: tier deixou de ser único.
 */
export async function seedPlans(prisma: PrismaClient): Promise<void> {
  for (const plan of PLAN_SEED) {
    const existing = await prisma.plan.findFirst({ where: { tier: plan.tier, active: true } });
    if (existing) {
      await prisma.plan.update({ where: { id: existing.id }, data: plan });
    } else {
      await prisma.plan.create({ data: plan });
    }
  }
}

/** Popula/atualiza a tabela `AddonPlan` com os valores iniciais (idempotente por tier). */
export async function seedAddonPlans(prisma: PrismaClient): Promise<void> {
  for (const addon of ADDON_PLAN_SEED) {
    await prisma.addonPlan.upsert({ where: { tier: addon.tier }, update: addon, create: addon });
  }
}
