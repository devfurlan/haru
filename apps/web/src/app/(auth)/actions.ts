'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { Prisma, prisma } from '@haru/database';

import { createClient } from '@/lib/supabase/server';
import { uniqueSlug } from '@/lib/slug';

export type ActionResult = { error: string } | undefined;

function traduzErroSignUp(error: { code?: string; message?: string }): string {
  switch (error.code) {
    case 'user_already_exists':
    case 'email_exists':
      return 'Este email já está cadastrado.';
    case 'weak_password':
      return 'Senha muito fraca. Use ao menos 8 caracteres.';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Muitas tentativas. Tente novamente em alguns minutos.';
    case 'signup_disabled':
      return 'O cadastro está temporariamente desativado.';
    default:
      if (error.message && /already registered|already exists/i.test(error.message)) {
        return 'Este email já está cadastrado.';
      }
      return 'Falha ao criar conta';
  }
}

const signUpSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter ao menos 8 caracteres'),
  businessName: z.string().min(2, 'Nome do estabelecimento muito curto').max(80),
  ownerName: z
    .string()
    .max(80)
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : undefined)),
});

export async function signUp(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    businessName: formData.get('businessName'),
    ownerName: formData.get('ownerName'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }
  const { email, password, businessName, ownerName } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error || !data.user) {
    return { error: error ? traduzErroSignUp(error) : 'Falha ao criar conta' };
  }

  try {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const tenant = await tx.tenant.create({
        data: { name: businessName, slug: uniqueSlug(businessName) },
      });
      await tx.user.create({
        data: {
          authId: data.user!.id,
          email,
          name: ownerName ?? null,
          role: 'OWNER',
          // Dono já define a senha no signup — nasce ativo (explícito p/ não
          // depender do default do schema).
          status: 'ACTIVE',
          tenantId: tenant.id,
        },
      });
    });
  } catch (err) {
    console.error('[signUp] falha ao bootstrap tenant', err);
    return { error: 'Não foi possível criar o estabelecimento' };
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

const signInSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
});

export async function signIn(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: 'Credenciais inválidas' };
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}
