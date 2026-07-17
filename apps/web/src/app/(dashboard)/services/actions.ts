'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { prisma } from '@haru/database';

import { requireUserAndTenant } from '@/lib/auth';

export type ServiceActionResult = { error: string } | { ok: true };

const priceSchema = z
  .string()
  .min(1, 'Informe um preço')
  // Aceita formato BR ("1.234,56") removendo separador de milhar antes de trocar a vírgula decimal.
  .transform((v) => Number(v.replace(/\./g, '').replace(',', '.')))
  .refine((n) => Number.isFinite(n) && n >= 0, { message: 'Preço inválido' });

const durationSchema = z
  .string()
  .min(1, 'Informe a duração')
  .transform((v) => Number(v))
  .refine((n) => Number.isInteger(n) && n > 0 && n <= 8 * 60, {
    message: 'Duração deve estar entre 1 e 480 minutos',
  });

const serviceSchema = z.object({
  name: z.string().min(2, 'Nome muito curto').max(80),
  description: z
    .string()
    .max(280)
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : null)),
  durationMinutes: durationSchema,
  priceCents: priceSchema.transform((reais) => Math.round(reais * 100)),
  // Ritmo de retorno (dias) opcional: vazio = null (a engine aprende do histórico).
  returnCycleDays: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() ? Number(v) : null))
    .refine((n) => n === null || (Number.isInteger(n) && n > 0 && n <= 365), {
      message: 'Ritmo de retorno deve ser entre 1 e 365 dias',
    }),
});

/**
 * Resolve quais profissionais (do tenant) atendem o serviço a partir do que veio do
 * formulário. Filtra ids inválidos; se nada válido sobrar (caso solo ou nenhum
 * marcado), assume TODOS os profissionais - assim o serviço nunca fica sem ninguém
 * que o execute (e some do booking sem querer).
 */
async function resolveServiceProfessionalIds(
  tenantId: string,
  requested: string[],
): Promise<string[]> {
  const pros = await prisma.user.findMany({
    where: { tenantId, isProfessional: true },
    select: { id: true },
  });
  const allIds = pros.map((p) => p.id);
  if (allIds.length === 0) return [];
  const filtered = requested.filter((id) => allIds.includes(id));
  return filtered.length > 0 ? filtered : allIds;
}

export async function createService(
  _prev: ServiceActionResult | undefined,
  formData: FormData,
): Promise<ServiceActionResult> {
  const { tenant } = await requireUserAndTenant();

  const parsed = serviceSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
    durationMinutes: formData.get('durationMinutes'),
    priceCents: formData.get('priceReais'),
    returnCycleDays: formData.get('returnCycleDays'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  const professionalIds = await resolveServiceProfessionalIds(
    tenant.id,
    formData.getAll('professionalIds').map(String),
  );

  await prisma.$transaction(async (tx) => {
    const service = await tx.service.create({
      data: {
        tenantId: tenant.id,
        name: parsed.data.name,
        description: parsed.data.description,
        durationMinutes: parsed.data.durationMinutes,
        priceCents: parsed.data.priceCents,
        returnCycleDays: parsed.data.returnCycleDays,
      },
    });
    if (professionalIds.length > 0) {
      await tx.professionalService.createMany({
        data: professionalIds.map((professionalId) => ({ professionalId, serviceId: service.id })),
        skipDuplicates: true,
      });
    }
  });

  revalidatePath('/services');
  return { ok: true };
}

export async function updateService(
  serviceId: string,
  _prev: ServiceActionResult | undefined,
  formData: FormData,
): Promise<ServiceActionResult> {
  const { tenant } = await requireUserAndTenant();

  const parsed = serviceSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
    durationMinutes: formData.get('durationMinutes'),
    priceCents: formData.get('priceReais'),
    returnCycleDays: formData.get('returnCycleDays'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  const exists = await prisma.service.findFirst({
    where: { id: serviceId, tenantId: tenant.id },
    select: { id: true },
  });
  if (!exists) return { error: 'Serviço não encontrado' };

  const professionalIds = await resolveServiceProfessionalIds(
    tenant.id,
    formData.getAll('professionalIds').map(String),
  );

  await prisma.$transaction(async (tx) => {
    await tx.service.update({
      where: { id: serviceId },
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        durationMinutes: parsed.data.durationMinutes,
        priceCents: parsed.data.priceCents,
        returnCycleDays: parsed.data.returnCycleDays,
      },
    });
    // Reconcilia o vínculo N:N (delete + recreate). Não afeta agendamentos passados,
    // que guardam o profissional em Appointment.professionalId, não aqui.
    await tx.professionalService.deleteMany({ where: { serviceId } });
    if (professionalIds.length > 0) {
      await tx.professionalService.createMany({
        data: professionalIds.map((professionalId) => ({ professionalId, serviceId })),
        skipDuplicates: true,
      });
    }
  });

  revalidatePath('/services');
  return { ok: true };
}

export async function toggleServiceActive(serviceId: string, nextActive: boolean) {
  const { tenant } = await requireUserAndTenant();
  await prisma.service.updateMany({
    where: { id: serviceId, tenantId: tenant.id },
    data: { active: nextActive },
  });
  revalidatePath('/services');
}

export async function deleteService(serviceId: string) {
  const { tenant } = await requireUserAndTenant();
  await prisma.service.deleteMany({
    where: { id: serviceId, tenantId: tenant.id },
  });
  revalidatePath('/services');
}
