import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

import { prisma } from '@haru/database';
import type { CustomerAccount } from '@haru/database';

import { getAuthUser } from './auth';

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
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await bearerClient.auth.getUser(token);
  if (error || !data.user) return null;
  return prisma.customerAccount.findUnique({ where: { authId: data.user.id } });
}
