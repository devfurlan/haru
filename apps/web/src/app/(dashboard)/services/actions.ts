'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { prisma } from '@haru/database';

import { requireUserAndTenant } from '@/lib/auth';

export type ServiceActionResult = { error: string } | { ok: true };

const priceSchema = z
  .string()
  .min(1, 'Informe um preço')
  .transform((v) => Number(v.replace(',', '.')))
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
  description: z.string().max(280).optional().transform((v) => (v && v.trim() ? v.trim() : null)),
  durationMinutes: durationSchema,
  priceCents: priceSchema.transform((reais) => Math.round(reais * 100)),
});

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
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  await prisma.service.create({
    data: {
      tenantId: tenant.id,
      name: parsed.data.name,
      description: parsed.data.description,
      durationMinutes: parsed.data.durationMinutes,
      priceCents: parsed.data.priceCents,
    },
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
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  const result = await prisma.service.updateMany({
    where: { id: serviceId, tenantId: tenant.id },
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      durationMinutes: parsed.data.durationMinutes,
      priceCents: parsed.data.priceCents,
    },
  });
  if (result.count === 0) return { error: 'Serviço não encontrado' };

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
