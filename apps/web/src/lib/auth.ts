import { cache } from 'react';
import { redirect } from 'next/navigation';

import { prisma } from '@haru/database';
import type { Tenant, User } from '@haru/database';

import { createClient } from './supabase/server';

export type CurrentUser = User & { tenant: Tenant };

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
    include: { tenant: true },
  });
  return user;
});

/** Variante que redireciona pra /login se não estiver autenticado. */
export async function requireUserAndTenant(): Promise<CurrentUser> {
  const result = await getCurrentUserAndTenant();
  if (!result) redirect('/login');
  return result;
}
