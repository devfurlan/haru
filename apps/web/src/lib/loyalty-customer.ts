// Fidelidade do lado do CLIENTE (área /conta + app mobile). Cross-tenant: reúne os
// cartões do cliente em todos os estabelecimentos onde ele tem carimbo. As leituras
// derivam do histórico (lib/loyalty.ts). O RESGATE pode partir do cliente
// (redeemCustomerLoyaltyPrize, usado no app) OU do dono no painel ("Confirmar resgate")
// - os dois criam a mesma LoyaltyRedemption e zeram o cartão; o dono honra o prêmio.

import { prisma } from '@haru/database';
import type { CustomerAccount } from '@haru/database';

import {
  getContactQualifyingAppointments,
  getLoyaltyProgram,
  stampsForContact,
} from '@/lib/loyalty';
import { prizeLabelOf } from '@/lib/loyalty-constants';

export interface CustomerLoyaltyCard {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  logoUrl: string | null;
  stamps: number;
  required: number;
  pct: number;
  won: boolean;
  ruleLabel: string;
  prizeLabel: string;
}

export interface CustomerLoyaltyVisit {
  id: string;
  serviceName: string;
  whenLabel: string;
}

export interface CustomerLoyaltyCardDetail extends CustomerLoyaltyCard {
  timezone: string;
  visits: CustomerLoyaltyVisit[];
}

/** Mapa tenantId -> contactId dos Contacts da conta (um por tenant). */
async function contactsByTenant(accountId: string): Promise<Map<string, string>> {
  const contacts = await prisma.contact.findMany({
    where: { customerAccountId: accountId },
    select: { id: true, tenantId: true },
  });
  const map = new Map<string, string>();
  for (const c of contacts) if (!map.has(c.tenantId)) map.set(c.tenantId, c.id);
  return map;
}

const PROGRAM_SELECT = {
  id: true,
  stampsRequired: true,
  prizeKind: true,
  discountPercent: true,
  countMode: true,
  stampTtlDays: true,
  tenantId: true,
  tenant: { select: { name: true, slug: true, logoUrl: true, timezone: true } },
  prizeService: { select: { name: true } },
  qualifyingServices: { select: { serviceId: true } },
} as const;

type ProgramRow = {
  id: string;
  stampsRequired: number;
  prizeKind: 'FREE_SERVICE' | 'DISCOUNT';
  discountPercent: number | null;
  countMode: 'ALL_SERVICES' | 'SPECIFIC';
  stampTtlDays: number | null;
  tenantId: string;
  tenant: { name: string; slug: string; logoUrl: string | null; timezone: string };
  prizeService: { name: string } | null;
  qualifyingServices: { serviceId: string }[];
};

/** Extrai a regra de carimbo (o que o helper compartilhado precisa) de um ProgramRow. */
function toStampRule(p: ProgramRow) {
  return {
    id: p.id,
    stampTtlDays: p.stampTtlDays,
    countMode: p.countMode,
    qualifyingServiceIds: p.qualifyingServices.map((s) => s.serviceId),
  };
}

function ruleAndPrize(p: ProgramRow) {
  const prizeLabel = prizeLabelOf({
    prizeKind: p.prizeKind,
    prizeServiceName: p.prizeService?.name ?? null,
    discountPercent: p.discountPercent,
  });
  return { prizeLabel, ruleLabel: `A cada ${p.stampsRequired} visitas, ${prizeLabel}` };
}

function baseCard(p: ProgramRow, stamps: number): CustomerLoyaltyCard {
  const required = p.stampsRequired;
  const { prizeLabel, ruleLabel } = ruleAndPrize(p);
  return {
    tenantId: p.tenantId,
    tenantSlug: p.tenant.slug,
    tenantName: p.tenant.name,
    logoUrl: p.tenant.logoUrl,
    stamps,
    required,
    pct: Math.min(100, Math.round((stamps / required) * 100)),
    won: stamps >= required,
    ruleLabel,
    prizeLabel,
  };
}

/**
 * Cartões do cliente: um por estabelecimento (programa ativo) onde ele já tem ao menos
 * 1 carimbo. Prêmio liberado primeiro, depois mais cheios. Programas pausados não
 * aparecem ("só os lugares com programa no ar").
 */
export async function getCustomerLoyaltyCards(
  account: CustomerAccount,
): Promise<CustomerLoyaltyCard[]> {
  const byTenant = await contactsByTenant(account.id);
  if (byTenant.size === 0) return [];

  const programs = (await prisma.loyaltyProgram.findMany({
    where: { tenantId: { in: [...byTenant.keys()] }, pausedAt: null },
    select: PROGRAM_SELECT,
  })) as ProgramRow[];

  const cards: CustomerLoyaltyCard[] = [];
  for (const p of programs) {
    const contactId = byTenant.get(p.tenantId)!;
    const stamps = (await getContactQualifyingAppointments(toStampRule(p), p.tenantId, contactId))
      .length;
    if (stamps >= 1) cards.push(baseCard(p, stamps));
  }

  return cards.sort((a, b) => Number(b.won) - Number(a.won) || b.pct - a.pct);
}

/** Detalhe de um cartão (grid de carimbos + últimas visitas). null se o cliente não
 * tem esse cartão (sem Contact no tenant, sem programa ativo). */
export async function getCustomerLoyaltyCard(
  account: CustomerAccount,
  tenantId: string,
): Promise<CustomerLoyaltyCardDetail | null> {
  const byTenant = await contactsByTenant(account.id);
  const contactId = byTenant.get(tenantId);
  if (!contactId) return null;

  const p = (await prisma.loyaltyProgram.findFirst({
    where: { tenantId, pausedAt: null },
    select: PROGRAM_SELECT,
  })) as ProgramRow | null;
  if (!p) return null;

  const qualifying = await getContactQualifyingAppointments(toStampRule(p), tenantId, contactId);
  const tz = p.tenant.timezone;
  const visits: CustomerLoyaltyVisit[] = qualifying.slice(0, 12).map((v) => ({
    id: v.id,
    serviceName: v.serviceName,
    whenLabel: new Intl.DateTimeFormat('pt-BR', {
      timeZone: tz,
      day: '2-digit',
      month: 'long',
    }).format(v.startsAt),
  }));

  return { ...baseCard(p, qualifying.length), timezone: tz, visits };
}

export type RedeemResult = { ok: true; prizeLabel: string; required: number } | { error: string };

/**
 * Resgate feito PELO CLIENTE (app/web): zera o cartão dele num estabelecimento. Cria a
 * mesma LoyaltyRedemption que o dono cria ao "Confirmar resgate" - o dono honra o prêmio
 * na visita (vê a contagem de resgatados subir). Valida no servidor que o cartão está
 * realmente completo (defesa contra clique fora de hora / cliente adulterando o app).
 */
export async function redeemCustomerLoyaltyPrize(
  account: CustomerAccount,
  tenantId: string,
): Promise<RedeemResult> {
  const byTenant = await contactsByTenant(account.id);
  const contactId = byTenant.get(tenantId);
  if (!contactId) return { error: 'Você não tem cartão neste estabelecimento.' };

  const program = await getLoyaltyProgram(tenantId);
  if (!program) return { error: 'O programa de fidelidade não está mais no ar.' };

  const stamps = await stampsForContact(program, tenantId, contactId);
  if (stamps < program.stampsRequired) {
    return { error: 'Seu cartão ainda não está completo.' };
  }

  await prisma.loyaltyRedemption.create({
    data: { programId: program.id, contactId, stampsUsed: program.stampsRequired },
  });

  return { ok: true, prizeLabel: prizeLabelOf(program), required: program.stampsRequired };
}
