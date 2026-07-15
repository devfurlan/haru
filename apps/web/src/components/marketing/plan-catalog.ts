import { prisma } from '@haru/database';

// Catálogo de planos da vitrine (home + /precos lêem a MESMA fonte: tabela Plan).
// Fetch resiliente com fallback embutido, e formatadores de preço BRL. As páginas
// montam seus próprios "view models" (fraseado difere), mas os números vêm daqui.

export type PlanRow = {
  tier: string;
  name: string;
  priceMonthlyCents: number;
  priceAnnualCents: number;
  maxProfessionals: number | null;
  whatsappRemindersPerMonth: number | null;
};

// Defaults coerentes: se o catálogo não puder ser lido (DB fora), a vitrine ainda
// renderiza com preços em vez de sumir.
export const FALLBACK_PLANS: PlanRow[] = [
  {
    tier: 'ESSENCIAL',
    name: 'Solo',
    priceMonthlyCents: 7900,
    priceAnnualCents: 79000,
    maxProfessionals: 1,
    whatsappRemindersPerMonth: 250,
  },
  {
    tier: 'PROFISSIONAL',
    name: 'Time',
    priceMonthlyCents: 12900,
    priceAnnualCents: 129000,
    maxProfessionals: 6,
    whatsappRemindersPerMonth: 900,
  },
  {
    tier: 'NEGOCIO',
    name: 'Multi',
    priceMonthlyCents: 19900,
    priceAnnualCents: 199000,
    maxProfessionals: 15,
    whatsappRemindersPerMonth: 2200,
  },
];

/** Planos ativos (Solo/Time/Multi, sem Enterprise), em ordem de exibição. */
export async function getActivePlans(): Promise<PlanRow[]> {
  try {
    const plans = await prisma.plan.findMany({
      where: { active: true, tier: { not: 'ENTERPRISE' } },
      orderBy: { displayOrder: 'asc' },
      select: {
        tier: true,
        name: true,
        priceMonthlyCents: true,
        priceAnnualCents: true,
        maxProfessionals: true,
        whatsappRemindersPerMonth: true,
      },
    });
    return plans.length ? plans : FALLBACK_PLANS;
  } catch (err) {
    console.error('[plan-catalog] catálogo indisponível, usando fallback', err);
    return FALLBACK_PLANS;
  }
}

/** "R$ 69" (sem centavos). */
export const brl0 = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });

/** "R$ 65,83" (2 casas). Usado no preço mensal-equivalente do anual (anual/12). */
export const brl2 = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
