'use server';

import { prisma } from '@haru/database';
import { hasServiceSubscriptions } from '@haru/billing';
import { revalidatePath } from 'next/cache';

import { requireUserAndTenant } from '@/lib/auth';
import { getMembershipHistory, type MembershipHistory } from '@/lib/subscriptions-panel';

import { cancelMembershipByOwner } from './subscribe';

/**
 * Ações do DONO sobre os planos de assinatura de serviços (o catálogo do "Clube"). Gate
 * NÃO-BURLÁVEL no WRITE: assinatura de serviços é feature Time+ (hasServiceSubscriptions) -
 * não basta esconder no front. Pausar um plano (active=false) para de VENDER, mas quem já
 * assina continua (a Membership tem snapshot próprio).
 */

const GATE_MSG = 'Assinaturas de serviço estão disponíveis a partir do plano Time.';

export interface PlanServiceInput {
  serviceId: string;
  /** Créditos que um agendamento deste serviço consome (default 1). */
  creditCost?: number;
}

export interface PlanInput {
  name: string;
  description?: string | null;
  priceCents: number;
  creditsPerCycle: number;
  creditRollover: boolean;
  /** Teto de acúmulo quando creditRollover=true (null = sem teto). */
  rolloverCap?: number | null;
  services: PlanServiceInput[];
}

type PlanResult = { ok: true; planId: string } | { error: string };

/** Valida a entrada e que os serviços pertencem ao tenant. Retorna msg de erro ou null. */
async function validate(tenantId: string, input: PlanInput): Promise<string | null> {
  if (!input.name.trim()) return 'Dê um nome ao plano.';
  if (!Number.isInteger(input.priceCents) || input.priceCents <= 0) return 'Preço inválido.';
  if (!Number.isInteger(input.creditsPerCycle) || input.creditsPerCycle <= 0) {
    return 'Informe quantos créditos o plano dá por mês.';
  }
  if (input.creditRollover && input.rolloverCap != null && input.rolloverCap < input.creditsPerCycle) {
    return 'O teto de acúmulo não pode ser menor que os créditos por mês.';
  }
  if (input.services.length === 0) return 'Inclua pelo menos um serviço no plano.';
  if (input.services.some((s) => s.creditCost != null && s.creditCost <= 0)) {
    return 'O custo em créditos de um serviço tem que ser pelo menos 1.';
  }
  const ids = input.services.map((s) => s.serviceId);
  const valid = await prisma.service.count({ where: { id: { in: ids }, tenantId } });
  if (valid !== new Set(ids).size) return 'Algum serviço selecionado é inválido.';
  return null;
}

function serviceRows(input: PlanInput) {
  return input.services.map((s) => ({ serviceId: s.serviceId, creditCost: s.creditCost ?? 1 }));
}

export async function createMembershipPlan(input: PlanInput): Promise<PlanResult> {
  const { tenant } = await requireUserAndTenant();
  if (!hasServiceSubscriptions(tenant.subscription)) return { error: GATE_MSG };

  const err = await validate(tenant.id, input);
  if (err) return { error: err };

  const plan = await prisma.membershipPlan.create({
    data: {
      tenantId: tenant.id,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      priceCents: input.priceCents,
      creditsPerCycle: input.creditsPerCycle,
      creditRollover: input.creditRollover,
      rolloverCap: input.creditRollover ? (input.rolloverCap ?? null) : null,
      services: { create: serviceRows(input) },
    },
    select: { id: true },
  });
  revalidatePath('/assinaturas-clientes');
  return { ok: true, planId: plan.id };
}

export async function updateMembershipPlan(planId: string, input: PlanInput): Promise<PlanResult> {
  const { tenant } = await requireUserAndTenant();
  if (!hasServiceSubscriptions(tenant.subscription)) return { error: GATE_MSG };

  const owned = await prisma.membershipPlan.findFirst({
    where: { id: planId, tenantId: tenant.id },
    select: { id: true },
  });
  if (!owned) return { error: 'Plano não encontrado' };

  const err = await validate(tenant.id, input);
  if (err) return { error: err };

  // Reprecificar/editar NÃO afeta quem já assina (a Membership tem snapshot). Regrava a lista
  // de serviços (deleteMany + create) na mesma transação.
  await prisma.$transaction([
    prisma.membershipPlanService.deleteMany({ where: { planId } }),
    prisma.membershipPlan.update({
      where: { id: planId },
      data: {
        name: input.name.trim(),
        description: input.description?.trim() || null,
        priceCents: input.priceCents,
        creditsPerCycle: input.creditsPerCycle,
        creditRollover: input.creditRollover,
        rolloverCap: input.creditRollover ? (input.rolloverCap ?? null) : null,
        services: { create: serviceRows(input) },
      },
    }),
  ]);
  revalidatePath('/assinaturas-clientes');
  return { ok: true, planId };
}

/** Pausa (active=false) ou reativa (true) a VENDA do plano. Não mexe em quem já assina. */
export async function setMembershipPlanActive(
  planId: string,
  active: boolean,
): Promise<{ ok: true } | { error: string }> {
  const { tenant } = await requireUserAndTenant();
  if (!hasServiceSubscriptions(tenant.subscription)) return { error: GATE_MSG };

  const result = await prisma.membershipPlan.updateMany({
    where: { id: planId, tenantId: tenant.id },
    data: { active },
  });
  if (result.count === 0) return { error: 'Plano não encontrado' };
  revalidatePath('/assinaturas-clientes');
  return { ok: true };
}

/**
 * Cancela a assinatura de UM cliente, pelo dono. Destrutivo (para as cobranças), mas os créditos
 * já pagos valem até o fim do ciclo - a UI avisa isso na confirmação. Trava por ownership do
 * tenant; gate NÃO-BURLÁVEL (feature Time+).
 */
export async function cancelMembershipAsOwner(
  membershipId: string,
): Promise<{ ok: true } | { error: string }> {
  const { tenant } = await requireUserAndTenant();
  if (!hasServiceSubscriptions(tenant.subscription)) return { error: GATE_MSG };

  const result = await cancelMembershipByOwner({ membershipId, tenantId: tenant.id });
  if ('error' in result) return result;
  revalidatePath('/assinaturas-clientes');
  return { ok: true };
}

/** Histórico de cobranças de uma assinatura, pro modal "ver histórico". Trava por ownership. */
export async function fetchMembershipHistory(
  membershipId: string,
): Promise<MembershipHistory | null> {
  const { tenant } = await requireUserAndTenant();
  if (!hasServiceSubscriptions(tenant.subscription)) return null;
  return getMembershipHistory(tenant.id, membershipId, tenant.timezone);
}
