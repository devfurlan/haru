'use server';

import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

export type ResetPasswordResult = { error: string } | { ok: true };

const resetSchema = z
  .object({
    password: z.string().min(8, 'A senha deve ter ao menos 8 caracteres').max(72),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    path: ['confirm'],
    message: 'As senhas não coincidem',
  });

/**
 * Define a nova senha do usuário. Depende da sessão de recovery já estabelecida
 * no cliente (verifyOtp na tela /redefinir-senha) - os cookies chegam aqui via
 * createClient(). Sem sessão, recusa. Diferente do /ativar, não mexe no status
 * do User: aqui ele já é uma conta ativa apenas redefinindo a senha.
 */
export async function resetPassword(
  _prev: ResetPasswordResult | undefined,
  formData: FormData,
): Promise<ResetPasswordResult> {
  const parsed = resetSchema.safeParse({
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
    return { error: 'Link inválido ou expirado. Solicite uma nova recuperação de senha.' };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { error: 'Não foi possível redefinir a senha. Tente novamente.' };
  }

  return { ok: true };
}
