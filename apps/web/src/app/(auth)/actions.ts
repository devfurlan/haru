'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { Prisma, prisma } from '@haru/database';

import { traduzErroSignUp } from '@/lib/auth-errors';
import { getBaseUrl } from '@/lib/base-url';
import { TERMS_VERSION } from '@/lib/legal';
import { parsePlanParam } from '@/lib/plan-query';
import { createClient } from '@/lib/supabase/server';
import { uniqueSlug } from '@/lib/slug';

export type ActionResult = { error: string } | undefined;

export type ForgotPasswordResult = { error: string } | { ok: true } | undefined;

const signUpSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter ao menos 8 caracteres'),
  businessName: z.string().min(2, 'Nome do estabelecimento muito curto').max(80),
  ownerName: z.string().trim().min(2, 'Informe seu nome').max(80),
  acceptTerms: z.literal('on', {
    errorMap: () => ({ message: 'É preciso aceitar os Termos e a Política de Privacidade.' }),
  }),
});

export async function signUp(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    businessName: formData.get('businessName'),
    ownerName: formData.get('ownerName'),
    acceptTerms: formData.get('acceptTerms'),
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
          name: ownerName,
          role: 'OWNER',
          // Dono já define a senha no signup - nasce ativo (explícito p/ não
          // depender do default do schema).
          status: 'ACTIVE',
          // Prova de consentimento coletada no momento do cadastro.
          termsAcceptedAt: new Date(),
          termsVersion: TERMS_VERSION,
          tenantId: tenant.id,
        },
      });
    });
  } catch (err) {
    console.error('[signUp] falha ao bootstrap tenant', err);
    return { error: 'Não foi possível criar o estabelecimento' };
  }

  revalidatePath('/', 'layout');
  // Veio de um card de plano na home? Leva ao checkout com o plano já marcado;
  // senão, cai no dashboard. parsePlanParam descarta valores inválidos.
  const plano = parsePlanParam(formData.get('plano') as string | null);
  redirect(plano ? `/assinatura?plano=${plano.toLowerCase()}` : '/dashboard');
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
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    return { error: 'Credenciais inválidas' };
  }

  // Esta é a entrada do painel (dono/equipe). Se a sessão for de alguém que só tem
  // conta de quem agenda, manda pra área de agendamentos em vez de prender no painel.
  const user = await prisma.user.findUnique({ where: { authId: data.user.id } });
  if (!user) {
    const customer = await prisma.customerAccount.findUnique({
      where: { authId: data.user.id },
    });
    if (customer) {
      revalidatePath('/', 'layout');
      redirect('/conta');
    }
    // Sessão sem vínculo no domínio (caso raro/órfão): encerra e avisa.
    await supabase.auth.signOut();
    return { error: 'Não encontramos um painel para esta conta.' };
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
});

/**
 * Dispara o e-mail de recuperação de senha (link no formato token_hash, igual ao
 * /ativar - ver template recovery em supabase/config.toml). Sempre retorna ok,
 * mesmo se o e-mail não existir: confirmar/negar o cadastro vazaria quais
 * e-mails têm conta (enumeração). O rate-limit fica por conta do Supabase.
 */
export async function requestPasswordReset(
  _prev: ForgotPasswordResult,
  formData: FormData,
): Promise<ForgotPasswordResult> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Email inválido' };
  }

  const supabase = await createClient();
  const baseUrl = await getBaseUrl();
  // Passa pelo /auth/confirm: ele troca o token (code ou token_hash) por sessão
  // no servidor e então manda pro /redefinir-senha já autenticado.
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${baseUrl}/auth/confirm?next=/redefinir-senha`,
  });

  return { ok: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}
