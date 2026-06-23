'use server';

import { Prisma, prisma } from '@haru/database';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireAdmin } from '@/lib/admin-auth';

export type FormResult = { error: string } | { ok: true };

/** "49,90" / "49.90" / "49" -> centavos (int). Vazio/invalid -> erro via schema. */
const reaisToCents = z
  .string()
  .min(1, 'Preço obrigatório')
  .transform((v) => Math.round(Number(v.replace(/\./g, '').replace(',', '.')) * 100))
  .refine((n) => Number.isFinite(n) && n >= 0, { message: 'Preço inválido' });

/** Limite opcional: vazio = ilimitado (null); senão inteiro >= 0. */
const optionalLimit = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() ? Number(v) : null))
  .refine((n) => n === null || (Number.isInteger(n) && n >= 0), {
    message: 'Limite inválido (use um inteiro ou deixe vazio para ilimitado)',
  });

const bool = z.preprocess((v) => v === 'on' || v === 'true', z.boolean());

const planFields = {
  name: z.string().min(2, 'Nome muito curto').max(80),
  priceMonthlyCents: reaisToCents,
  priceAnnualCents: reaisToCents,
  appointmentsPerMonth: optionalLimit,
  aiMessagesPerMonth: optionalLimit,
  maxStaff: optionalLimit,
  onlinePayments: bool,
  webhooks: bool,
  team: bool,
  active: bool,
  displayOrder: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() ? Number(v) : 0))
    .refine((n) => Number.isInteger(n) && n >= 0, { message: 'Ordem inválida' }),
};

function readFields(formData: FormData) {
  return {
    name: formData.get('name'),
    priceMonthlyCents: formData.get('priceMonthly'),
    priceAnnualCents: formData.get('priceAnnual'),
    appointmentsPerMonth: formData.get('appointmentsPerMonth'),
    aiMessagesPerMonth: formData.get('aiMessagesPerMonth'),
    maxStaff: formData.get('maxStaff'),
    onlinePayments: formData.get('onlinePayments'),
    webhooks: formData.get('webhooks'),
    team: formData.get('team'),
    active: formData.get('active'),
    displayOrder: formData.get('displayOrder'),
  };
}

const updateSchema = z.object({ id: z.string().min(1), ...planFields });

export async function updatePlan(_prev: FormResult | undefined, formData: FormData): Promise<FormResult> {
  await requireAdmin();

  const parsed = updateSchema.safeParse({ id: formData.get('id'), ...readFields(formData) });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const { id, ...data } = parsed.data;
  await prisma.plan.update({ where: { id }, data });

  revalidatePath('/planos');
  return { ok: true };
}

const createSchema = z.object({
  tier: z.enum(['ESSENCIAL', 'PROFISSIONAL', 'NEGOCIO', 'ENTERPRISE']),
  ...planFields,
});

export async function createPlan(_prev: FormResult | undefined, formData: FormData): Promise<FormResult> {
  await requireAdmin();

  const parsed = createSchema.safeParse({ tier: formData.get('tier'), ...readFields(formData) });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  try {
    await prisma.plan.create({ data: parsed.data });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return { error: 'Já existe um plano para esse tier' };
    }
    throw err;
  }

  revalidatePath('/planos');
  return { ok: true };
}
