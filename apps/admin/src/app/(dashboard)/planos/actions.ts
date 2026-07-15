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
  whatsappRemindersPerMonth: optionalLimit,
  maxProfessionals: optionalLimit,
  maxReceptionists: optionalLimit,
  onlinePayments: bool,
  webhooks: bool,
  team: bool,
  waitlist: bool,
  serviceSubscriptions: bool,
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
    whatsappRemindersPerMonth: formData.get('whatsappRemindersPerMonth'),
    maxProfessionals: formData.get('maxProfessionals'),
    maxReceptionists: formData.get('maxReceptionists'),
    onlinePayments: formData.get('onlinePayments'),
    webhooks: formData.get('webhooks'),
    team: formData.get('team'),
    waitlist: formData.get('waitlist'),
    serviceSubscriptions: formData.get('serviceSubscriptions'),
    active: formData.get('active'),
    displayOrder: formData.get('displayOrder'),
  };
}

/**
 * Só pode existir UM plano público por tier - garantido pelo índice parcial
 * `Plan_tier_active_key` (tier WHERE active). Vale no create e ao marcar um plano
 * personalizado como público.
 */
const DUPLICATE_PUBLIC_ERROR =
  'Já existe um plano público para esse tier. Desmarque "Público" para criar/manter um plano personalizado, ou edite o plano público existente.';

function isDuplicatePublic(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

const updateSchema = z.object({ id: z.string().min(1), ...planFields });

export async function updatePlan(
  _prev: FormResult | undefined,
  formData: FormData,
): Promise<FormResult> {
  await requireAdmin();

  const parsed = updateSchema.safeParse({ id: formData.get('id'), ...readFields(formData) });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const { id, ...data } = parsed.data;
  try {
    await prisma.plan.update({ where: { id }, data });
  } catch (err) {
    if (isDuplicatePublic(err)) return { error: DUPLICATE_PUBLIC_ERROR };
    throw err;
  }

  revalidatePath('/planos');
  return { ok: true };
}

const createSchema = z.object({
  tier: z.enum(['ESSENCIAL', 'PROFISSIONAL', 'NEGOCIO', 'ENTERPRISE']),
  ...planFields,
});

export async function createPlan(
  _prev: FormResult | undefined,
  formData: FormData,
): Promise<FormResult> {
  await requireAdmin();

  const parsed = createSchema.safeParse({ tier: formData.get('tier'), ...readFields(formData) });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  try {
    await prisma.plan.create({ data: parsed.data });
  } catch (err) {
    if (isDuplicatePublic(err)) return { error: DUPLICATE_PUBLIC_ERROR };
    throw err;
  }

  revalidatePath('/planos');
  return { ok: true };
}
