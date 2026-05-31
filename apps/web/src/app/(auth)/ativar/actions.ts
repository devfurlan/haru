'use server';

import { z } from 'zod';

import { prisma } from '@haru/database';

import { createClient } from '@/lib/supabase/server';

export type ActivateActionResult = { error: string } | { ok: true };

const activateSchema = z
  .object({
    password: z.string().min(8, 'A senha deve ter ao menos 8 caracteres').max(72),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    path: ['confirm'],
    message: 'As senhas não coincidem',
  });

/**
 * Finaliza a ativação: define a senha do convidado e marca o User como ACTIVE.
 * Depende da sessão de recovery já estabelecida no cliente (verifyOtp na tela
 * /ativar) — os cookies chegam aqui via createClient(). Sem sessão, recusa.
 */
export async function activateAccount(
  _prev: ActivateActionResult | undefined,
  formData: FormData,
): Promise<ActivateActionResult> {
  const parsed = activateSchema.safeParse({
    password: formData.get('password'),
    confirm: formData.get('confirm'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Link de ativação inválido ou expirado. Peça um novo convite.' };
  }

  // A sessão (estabelecida pelo verifyOtp) tem que corresponder a um User deste
  // app. Sem isso, a definição de senha não é nossa pra fazer.
  const dbUser = await prisma.user.findUnique({ where: { authId: user.id } });
  if (!dbUser) {
    return { error: 'Conta não encontrada. Peça um novo convite ao administrador.' };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { error: 'Não foi possível definir a senha. Tente novamente.' };
  }

  // A senha já foi definida no Auth; marcar ACTIVE não pode ficar pela metade.
  // Se falhar, o usuário JÁ consegue logar (senha válida) — logamos e seguimos,
  // pois bloquear o login seria pior que um status defasado (recuperável).
  try {
    await prisma.user.update({
      where: { authId: user.id },
      data: { status: 'ACTIVE', activatedAt: new Date() },
    });
  } catch (err) {
    console.error(`[activate] senha definida mas falhou ao marcar ACTIVE (authId ${user.id}):`, err);
  }

  return { ok: true };
}
