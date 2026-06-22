import { cache } from 'react';
import { redirect } from 'next/navigation';

import { prisma } from '@haru/database';
import type { Subscription, Tenant, User } from '@haru/database';

import { createClient } from './supabase/server';

export type CurrentUser = User & { tenant: Tenant & { subscription: Subscription | null } };

/**
 * Auth.user do Supabase (sem o User do Postgres).
 * Envolto em `cache()` para deduplicar a chamada dentro de um mesmo render
 * (layout + página chamam isto no mesmo request).
 */
export const getAuthUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * User do Postgres + Tenant, ou `null` se não houver sessão / sem User vinculado.
 * `cache()` evita refazer auth + query quando layout e página chamam no mesmo request.
 */
export const getCurrentUserAndTenant = cache(async (): Promise<CurrentUser | null> => {
  const authUser = await getAuthUser();
  if (!authUser) return null;

  const user = await prisma.user.findUnique({
    where: { authId: authUser.id },
    include: { tenant: { include: { subscription: true } } },
  });
  return user;
});

/** Variante que redireciona pra /login se não estiver autenticado. */
export async function requireUserAndTenant(): Promise<CurrentUser> {
  const result = await getCurrentUserAndTenant();
  if (!result) redirect('/login');
  return result;
}

/**
 * Exige um admin (OWNER). Redireciona pra /login se não autenticado e pra
 * /dashboard se for STAFF. Use em páginas/áreas restritas ao admin (ex.: gestão
 * de usuários, integrações). As server actions sensíveis devem checar o papel
 * por conta própria (defesa no servidor) - veja `isAdmin`.
 */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUserAndTenant();
  if (user.role !== 'OWNER') redirect('/dashboard');
  return user;
}

/** True se o usuário é admin (OWNER) do estabelecimento. */
export function isAdmin(user: Pick<User, 'role'>): boolean {
  return user.role === 'OWNER';
}
