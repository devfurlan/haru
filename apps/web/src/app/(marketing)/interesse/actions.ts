'use server';

import { z } from 'zod';

import { prisma } from '@haru/database';

export type InterestResult = { ok: true } | { ok: false; error: string } | undefined;

const interestSchema = z.object({
  name: z.string().min(2, 'Informe seu nome').max(80),
  businessName: z.string().min(2, 'Informe o nome do seu negócio').max(80),
  whatsapp: z
    .string()
    .min(8, 'Informe um WhatsApp válido')
    .max(20)
    .transform((v) => v.trim()),
  email: z
    .string()
    .email('Email inválido')
    .max(120)
    .optional()
    .or(z.literal(''))
    .transform((v) => (v ? v : undefined)),
  message: z
    .string()
    .max(500)
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : undefined)),
});

export async function submitInterest(
  _prev: InterestResult,
  formData: FormData,
): Promise<InterestResult> {
  const parsed = interestSchema.safeParse({
    name: formData.get('name'),
    businessName: formData.get('businessName'),
    whatsapp: formData.get('whatsapp'),
    email: formData.get('email'),
    message: formData.get('message'),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  try {
    await prisma.lead.create({ data: parsed.data });
  } catch (err) {
    console.error('[submitInterest] falha ao salvar lead', err);
    return { ok: false, error: 'Não foi possível enviar agora. Tente novamente em instantes.' };
  }

  return { ok: true };
}
