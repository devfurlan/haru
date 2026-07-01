import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

import { Prisma, prisma } from '@haru/database';
import type { CustomerAccount } from '@haru/database';

import { getAuthUser } from './auth';
import { TERMS_VERSION } from './legal';

// Auth da ÁREA DO CLIENTE final, espelhando lib/auth.ts (que cuida do dono/staff).
// Mesma sessão Supabase (auth.users), mas resolve a tabela CustomerAccount em vez de
// User. As duas áreas convivem: um mesmo authId pode ter User e/ou CustomerAccount.

/**
 * CustomerAccount do cliente logado, ou `null` se não houver sessão / a sessão não
 * for de um cliente (ex.: é um dono sem conta de cliente). Reaproveita `getAuthUser`
 * (já é `cache()`), então layout + página não refazem a chamada ao Supabase.
 */
export const getCustomerAccount = cache(async (): Promise<CustomerAccount | null> => {
  const authUser = await getAuthUser();
  if (!authUser) return null;
  return prisma.customerAccount.findUnique({ where: { authId: authUser.id } });
});

/** Variante que redireciona pra /conta/entrar se não houver conta de cliente. */
export async function requireCustomerAccount(): Promise<CustomerAccount> {
  const account = await getCustomerAccount();
  if (!account) redirect('/conta/entrar');
  return account;
}

// ---------------------------------------------------------------------------
// Provisionamento pós-OAuth (Google). O Supabase já criou o auth.users; aqui a
// gente garante o CustomerAccount do domínio. Idempotente: serve login e cadastro,
// e é reusado pelo callback web (/auth/callback) e pelo endpoint mobile.
// ---------------------------------------------------------------------------

type OAuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: { full_name?: string; name?: string } | null;
};

/**
 * Garante o CustomerAccount do usuário autenticado por OAuth. Se já existe (login),
 * devolve; senão cria com nome do Google e consentimento no momento do clique.
 *
 * `email-taken`: já existe outra conta (senha) com esse e-mail e outro authId. Ocorre
 * porque `enable_confirmations=false` deixa e-mails não-confirmados, então o Supabase
 * NÃO faz link automático de identidades e cria um auth.users novo. Não duplicamos;
 * o chamador desloga e pede pra entrar com senha.
 */
export async function ensureCustomerAccount(
  authUser: OAuthUser,
): Promise<{ ok: CustomerAccount } | { error: 'email-taken' }> {
  const existing = await prisma.customerAccount.findUnique({ where: { authId: authUser.id } });
  if (existing) return { ok: existing };

  try {
    const account = await prisma.customerAccount.create({
      data: {
        authId: authUser.id,
        email: authUser.email!,
        name: authUser.user_metadata?.full_name ?? authUser.user_metadata?.name ?? null,
        termsAcceptedAt: new Date(),
        termsVersion: TERMS_VERSION,
      },
    });
    return { ok: account };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return { error: 'email-taken' };
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Auth por Bearer JWT (app mobile). @supabase/ssr é só pra cookies; o app manda
// `Authorization: Bearer <jwt>` e validamos o token direto com @supabase/supabase-js.
// ---------------------------------------------------------------------------

// Sem sessão persistida: só valida tokens. Singleton (sem conexão, criação barata).
const bearerClient = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

/**
 * CustomerAccount a partir de um Bearer JWT do Supabase (app mobile), ou `null` se o
 * header faltar / o token for inválido / a sessão não for de um cliente. Espelha
 * `requireCustomerAccount` (cookies) - mesma query final, só troca a fonte do authId.
 * `getUser(token)` valida assinatura + expiração no Auth server (defesa forte).
 *
 * ponytail: getUser(jwt) faz round-trip ao Auth server por request; se a latência
 * doer, trocar por getClaims + JWKS (validação local, exige signing keys assimétricas).
 */
export async function requireCustomerAccountFromBearer(
  req: Request,
): Promise<CustomerAccount | null> {
  const user = await getBearerUser(req);
  if (!user) return null;
  return prisma.customerAccount.findUnique({ where: { authId: user.id } });
}

/**
 * Usuário Supabase (auth.users) a partir do Bearer JWT, ou `null` se faltar/for
 * inválido. Diferente de `requireCustomerAccountFromBearer`: NÃO exige que exista um
 * CustomerAccount - usado no provisionamento pós-OAuth, onde a conta ainda vai ser criada.
 */
export async function getBearerUser(req: Request) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await bearerClient.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}
