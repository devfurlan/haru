'use server';

import { prisma } from '@haru/database';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { requireUserAndTenant } from '@/lib/auth';

import { DEFAULT_END_MIN, DEFAULT_START_MIN, suggestionsFor } from './suggestions';

const finishSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome do negócio').max(80),
  segment: z
    .string()
    .trim()
    .max(40)
    .nullish()
    .transform((v) => (v && v.trim() ? v.trim() : null)),
  address: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((v) => (v && v.trim() ? v.trim() : null)),
  serviceKeys: z.array(z.string()).max(20).default([]),
  days: z.array(z.number().int().min(0).max(6)).max(7).default([]),
});

export type OnboardingResult = { error: string } | { ok: true };

/**
 * Grava tudo do wizard numa transação e marca onboardingCompletedAt. As definições
 * de serviço são reconstruídas no servidor a partir das KEYS (o cliente não injeta
 * nome/preço). O dono passa a ser profissional (isProfessional=true) para ter agenda
 * e receber agendamentos. NÃO redireciona - o wizard mostra a tela de sucesso.
 */
export async function finishOnboarding(input: unknown): Promise<OnboardingResult> {
  const { id: ownerId, tenant } = await requireUserAndTenant();

  const parsed = finishSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  const { name, segment, address, serviceKeys, days } = parsed.data;

  const services = suggestionsFor(segment).filter((s) => serviceKeys.includes(s.key));
  const uniqueDays = [...new Set(days)];

  await prisma.$transaction(async (tx) => {
    await tx.tenant.update({
      where: { id: tenant.id },
      data: { name, segment, address, onboardingCompletedAt: new Date() },
    });
    await tx.user.update({ where: { id: ownerId }, data: { isProfessional: true } });

    if (uniqueDays.length > 0) {
      await tx.scheduleBlock.deleteMany({ where: { professionalId: ownerId } });
      await tx.scheduleBlock.createMany({
        data: uniqueDays.map((weekday) => ({
          tenantId: tenant.id,
          professionalId: ownerId,
          weekday,
          startMinute: DEFAULT_START_MIN,
          endMinute: DEFAULT_END_MIN,
        })),
      });
    }

    for (const s of services) {
      const svc = await tx.service.create({
        data: {
          tenantId: tenant.id,
          name: s.name,
          durationMinutes: s.durationMinutes,
          priceCents: s.priceCents,
          active: true,
        },
      });
      await tx.professionalService.create({ data: { professionalId: ownerId, serviceId: svc.id } });
    }
  });

  // NÃO revalida aqui: revalidatePath('/', 'layout') invalidaria /onboarding, que
  // re-renderiza no servidor e (com onboardingCompletedAt agora setado) redireciona
  // pro dashboard - pulando a tela de sucesso. O "Ir pro painel" faz router.push,
  // que já busca o /dashboard fresh (dados novos aparecem na navegação).
  return { ok: true };
}

/** "Terminar depois": marca concluído (não reaparece) e sai do wizard. */
export async function skipOnboarding(plano?: string | null): Promise<void> {
  const { tenant } = await requireUserAndTenant();
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { onboardingCompletedAt: new Date() },
  });
  revalidatePath('/', 'layout');
  redirect(plano ? `/assinatura?plano=${encodeURIComponent(plano)}` : '/dashboard');
}
