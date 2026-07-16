'use server';

import * as Sentry from '@sentry/nextjs';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { Prisma, prisma } from '@haru/database';

import { getAuthUser } from '@/lib/auth';
import { traduzErroSignUp } from '@/lib/auth-errors';
import { getBaseUrl } from '@/lib/base-url';
import { TERMS_VERSION } from '@/lib/legal';
import { parsePlanParam } from '@/lib/plan-query';
import { createClient } from '@/lib/supabase/server';
import { uniqueSlug } from '@/lib/slug';

export type ActionResult = { error: string } | undefined;

export type ForgotPasswordResult = { error: string } | { ok: true } | undefined;

/**
 * Cria o Tenant + User(OWNER) do estabelecimento numa transação. Reusado pelos dois
 * caminhos de cadastro de dono - por senha (`signUp`) e por Google (`createOwnerFromOAuth`)
 * - que só diferem em como o auth.users nasce (auth.signUp vs OAuth). O dono nasce ACTIVE
 * (já autenticado) com a prova de consentimento do momento do cadastro. Pode lançar P2002
 * se o e-mail/authId já tiver painel.
 */
async function createOwnerTenant(params: {
  authId: string;
  email: string;
  ownerName: string;
  businessName: string;
}) {
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const tenant = await tx.tenant.create({
      data: { name: params.businessName, slug: uniqueSlug(params.businessName) },
    });
    await tx.user.create({
      data: {
        authId: params.authId,
        email: params.email,
        name: params.ownerName,
        role: 'OWNER',
        status: 'ACTIVE',
        termsAcceptedAt: new Date(),
        termsVersion: TERMS_VERSION,
        tenantId: tenant.id,
      },
    });
  });
}

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
    await createOwnerTenant({ authId: data.user.id, email, ownerName, businessName });
  } catch (err) {
    console.error('[signUp] falha ao bootstrap tenant', err);
    // Aqui a conta do Supabase JÁ existe e a transação do Postgres não: sobra um
    // auth.users órfão, sem User/Tenant. O usuário só vê "não foi possível" e
    // sai - sem isto, ninguém fica sabendo. Sem PII: só o erro e a tag.
    Sentry.captureException(err, { tags: { component: 'signup', phase: 'bootstrap-tenant' } });
    return { error: 'Não foi possível criar o estabelecimento' };
  }

  revalidatePath('/', 'layout');
  // Conta nova cai no onboarding (wizard de 4 passos). O plano escolhido na home é
  // preservado: ao concluir/pular o onboarding, segue pro checkout com ele marcado.
  const plano = parsePlanParam(formData.get('plano') as string | null);
  redirect(plano ? `/onboarding?plano=${plano.toLowerCase()}` : '/onboarding');
}

const ownerSetupSchema = z.object({
  businessName: z.string().min(2, 'Nome do estabelecimento muito curto').max(80),
  acceptTerms: z.literal('on', {
    errorMap: () => ({ message: 'É preciso aceitar os Termos e a Política de Privacidade.' }),
  }),
});

/**
 * Conclui o cadastro do DONO que entrou via Google. O auth.users já existe (OAuth), então
 * aqui só falta o nome do estabelecimento pra criar Tenant + User - nome e e-mail vêm da
 * sessão do Google. Chega pela tela /signup/estabelecimento (ver /auth/callback flow=owner).
 */
export async function createOwnerFromOAuth(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = ownerSetupSchema.safeParse({
    businessName: formData.get('businessName'),
    acceptTerms: formData.get('acceptTerms'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  const authUser = await getAuthUser();
  if (!authUser?.email) redirect('/signup'); // sessão sumiu: refaz o login com o Google

  // Idempotente: se já virou dono (duplo submit / voltou na tela), não recria.
  const existing = await prisma.user.findUnique({ where: { authId: authUser.id } });
  if (existing) redirect('/dashboard');

  const meta = authUser.user_metadata as { full_name?: string; name?: string } | null;
  const ownerName = (meta?.full_name ?? meta?.name ?? '').trim() || authUser.email.split('@')[0];

  try {
    await createOwnerTenant({
      authId: authUser.id,
      email: authUser.email,
      ownerName,
      businessName: parsed.data.businessName,
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      // E-mail/authId já vinculado a outro painel: manda entrar em vez de duplicar.
      return { error: 'Esse e-mail já tem um painel. Entre com e-mail e senha.' };
    }
    console.error('[createOwnerFromOAuth] falha ao bootstrap tenant', err);
    Sentry.captureException(err, {
      tags: { component: 'signup-oauth', phase: 'bootstrap-tenant' },
    });
    return { error: 'Não foi possível criar o estabelecimento' };
  }

  revalidatePath('/', 'layout');
  const plano = parsePlanParam(formData.get('plano') as string | null);
  redirect(plano ? `/onboarding?plano=${plano.toLowerCase()}` : '/onboarding');
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
