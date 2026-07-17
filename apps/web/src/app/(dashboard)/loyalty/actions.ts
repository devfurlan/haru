'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { prisma } from '@haru/database';

import { requireAdmin } from '@/lib/auth';
import { getLoyaltyProgram, stampsForContact } from '@/lib/loyalty';
import { DISCOUNT_OPTIONS, STAMP_MAX, STAMP_MIN, TTL_OPTIONS } from '@/lib/loyalty-constants';

export type LoyaltyActionResult = { error: string } | { ok: true };

const VALID_TTL = new Set(TTL_OPTIONS.map((o) => o.days));
const VALID_DISCOUNT = new Set(DISCOUNT_OPTIONS);

const programSchema = z.object({
  prizeKind: z.enum(['FREE_SERVICE', 'DISCOUNT']),
  prizeServiceId: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : null)),
  discountPercent: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() ? Number(v) : null)),
  stampsRequired: z
    .string()
    .transform((v) => Number(v))
    .refine((n) => Number.isInteger(n) && n >= STAMP_MIN && n <= STAMP_MAX, {
      message: `Escolha entre ${STAMP_MIN} e ${STAMP_MAX} carimbos`,
    }),
  countMode: z.enum(['ALL_SERVICES', 'SPECIFIC']),
  stampTtlDays: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() ? Number(v) : null)),
});

/** Cria ou atualiza o programa do tenant (um por tenant, upsert por tenantId). */
export async function saveLoyaltyProgram(
  _prev: LoyaltyActionResult | undefined,
  formData: FormData,
): Promise<LoyaltyActionResult> {
  const { tenant } = await requireAdmin();

  const parsed = programSchema.safeParse({
    prizeKind: formData.get('prizeKind'),
    prizeServiceId: formData.get('prizeServiceId'),
    discountPercent: formData.get('discountPercent'),
    stampsRequired: formData.get('stampsRequired'),
    countMode: formData.get('countMode'),
    stampTtlDays: formData.get('stampTtlDays'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }
  const data = parsed.data;

  if (data.stampTtlDays != null && !VALID_TTL.has(data.stampTtlDays)) {
    return { error: 'Validade inválida' };
  }

  // Serviços do tenant (pra validar prêmio e carimbos por serviço).
  const services = await prisma.service.findMany({
    where: { tenantId: tenant.id },
    select: { id: true },
  });
  const serviceIds = new Set(services.map((s) => s.id));

  let prizeServiceId: string | null = null;
  let discountPercent: number | null = null;
  if (data.prizeKind === 'FREE_SERVICE') {
    if (!data.prizeServiceId || !serviceIds.has(data.prizeServiceId)) {
      return { error: 'Escolha qual serviço é o prêmio' };
    }
    prizeServiceId = data.prizeServiceId;
  } else {
    if (data.discountPercent == null || !VALID_DISCOUNT.has(data.discountPercent)) {
      return { error: 'Escolha o desconto do prêmio' };
    }
    discountPercent = data.discountPercent;
  }

  let qualifyingIds: string[] = [];
  if (data.countMode === 'SPECIFIC') {
    qualifyingIds = formData
      .getAll('qualifyingServiceIds')
      .map(String)
      .filter((id) => serviceIds.has(id));
    if (qualifyingIds.length === 0) {
      return { error: 'Escolha ao menos um serviço que vale carimbo' };
    }
  }

  await prisma.$transaction(async (tx) => {
    const program = await tx.loyaltyProgram.upsert({
      where: { tenantId: tenant.id },
      create: {
        tenantId: tenant.id,
        stampsRequired: data.stampsRequired,
        prizeKind: data.prizeKind,
        prizeServiceId,
        discountPercent,
        countMode: data.countMode,
        stampTtlDays: data.stampTtlDays,
      },
      update: {
        stampsRequired: data.stampsRequired,
        prizeKind: data.prizeKind,
        prizeServiceId,
        discountPercent,
        countMode: data.countMode,
        stampTtlDays: data.stampTtlDays,
      },
    });
    // Reconcilia os serviços que valem carimbo (delete + recreate).
    await tx.loyaltyProgramService.deleteMany({ where: { programId: program.id } });
    if (qualifyingIds.length > 0) {
      await tx.loyaltyProgramService.createMany({
        data: qualifyingIds.map((serviceId) => ({ programId: program.id, serviceId })),
        skipDuplicates: true,
      });
    }
  });

  revalidatePath('/loyalty');
  return { ok: true };
}

/** Pausa/retoma o programa (congela a contagem de carimbos). */
export async function toggleLoyaltyPause() {
  const { tenant } = await requireAdmin();
  const program = await prisma.loyaltyProgram.findUnique({
    where: { tenantId: tenant.id },
    select: { pausedAt: true },
  });
  if (!program) return;
  await prisma.loyaltyProgram.update({
    where: { tenantId: tenant.id },
    data: { pausedAt: program.pausedAt ? null : new Date() },
  });
  revalidatePath('/loyalty');
}

/** Encerra o programa: apaga a regra (resgates e serviços caem em cascata). */
export async function endLoyaltyProgram() {
  const { tenant } = await requireAdmin();
  await prisma.loyaltyProgram.deleteMany({ where: { tenantId: tenant.id } });
  revalidatePath('/loyalty');
}

/** Confirma o resgate de um cliente que completou o cartão (zera o cartão dele). */
export async function redeemLoyaltyPrize(contactId: string) {
  const { tenant } = await requireAdmin();

  const program = await getLoyaltyProgram(tenant.id);
  if (!program) return;

  const contact = await prisma.contact.findFirst({
    where: { id: contactId, tenantId: tenant.id },
    select: { id: true },
  });
  if (!contact) return;

  // Defesa contra clique fora de hora: só resgata quem realmente completou o cartão.
  const stamps = await stampsForContact(program, tenant.id, contactId);
  if (stamps < program.stampsRequired) return;

  await prisma.loyaltyRedemption.create({
    data: { programId: program.id, contactId, stampsUsed: program.stampsRequired },
  });
  revalidatePath('/loyalty');
}
