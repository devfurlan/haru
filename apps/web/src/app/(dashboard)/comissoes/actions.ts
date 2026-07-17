'use server';

import { revalidatePath } from 'next/cache';

import { hasCommissions } from '@haru/billing';
import { prisma, type CompensationModel } from '@haru/database';

import { requireUserAndTenant } from '@/lib/auth';

export type SetCompensationInput = {
  professionalId: string;
  model: CompensationModel;
  /** COMMISSION_PERCENT: 0..100. */
  commissionPercent?: number | null;
  /** FIXED_PER_SERVICE / CHAIR_RENT: centavos. */
  fixedPerServiceCents?: number | null;
  chairRentCents?: number | null;
};

export type SetCompensationResult = { ok: true } | { error: string };

/**
 * Define/atualiza o modelo de remuneração de um profissional. Gate NÃO-burlável no corpo
 * (hasCommissions do snapshot) + ownership por tenant. Só grava os valores do modelo escolhido;
 * os outros ficam null.
 */
export async function setCompensation(input: SetCompensationInput): Promise<SetCompensationResult> {
  const { tenant, role } = await requireUserAndTenant();
  if (role !== 'OWNER') return { error: 'Só o dono configura remuneração.' };
  if (!hasCommissions(tenant.subscription)) {
    return { error: 'Comissões estão disponíveis a partir do plano Multi.' };
  }

  const pro = await prisma.user.findFirst({
    where: { id: input.professionalId, tenantId: tenant.id, isProfessional: true },
    select: { id: true },
  });
  if (!pro) return { error: 'Profissional não encontrado.' };

  let commissionPercent: number | null = null;
  let fixedPerServiceCents: number | null = null;
  let chairRentCents: number | null = null;

  switch (input.model) {
    case 'COMMISSION_PERCENT': {
      const p = Math.round(input.commissionPercent ?? -1);
      if (!(p >= 0 && p <= 100)) return { error: 'O percentual deve ser de 0 a 100.' };
      commissionPercent = p;
      break;
    }
    case 'FIXED_PER_SERVICE': {
      const c = Math.round(input.fixedPerServiceCents ?? -1);
      if (!(c >= 0)) return { error: 'Informe um valor por atendimento válido.' };
      fixedPerServiceCents = c;
      break;
    }
    case 'CHAIR_RENT': {
      const c = Math.round(input.chairRentCents ?? -1);
      if (!(c >= 0)) return { error: 'Informe um valor de aluguel válido.' };
      chairRentCents = c;
      break;
    }
    default:
      return { error: 'Modelo de remuneração inválido.' };
  }

  await prisma.professionalCompensation.upsert({
    where: { professionalId: input.professionalId },
    update: { model: input.model, commissionPercent, fixedPerServiceCents, chairRentCents },
    create: {
      professionalId: input.professionalId,
      tenantId: tenant.id,
      model: input.model,
      commissionPercent,
      fixedPerServiceCents,
      chairRentCents,
    },
  });

  revalidatePath('/comissoes');
  return { ok: true };
}
