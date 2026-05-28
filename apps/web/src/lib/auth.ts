import { redirect } from 'next/navigation';

import { prisma } from '@haru/database';
import type { Tenant, User } from '@haru/database';

import { createClient } from './supabase/server';

export type CurrentUser = User & { tenant: Tenant };

/** Auth.user do Supabase (sem o User do Postgres). */
export async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** User do Postgres + Tenant, ou `null` se não houver sessão / sem User vinculado. */
export async function getCurrentUserAndTenant(): Promise<CurrentUser | null> {
  const authUser = await getAuthUser();
  if (!authUser) return null;

  const user = await prisma.user.findUnique({
    where: { authId: authUser.id },
    include: { tenant: true },
  });
  return user;
}

/** Variante que redireciona pra /login se não estiver autenticado. */
export async function requireUserAndTenant(): Promise<CurrentUser> {
  const result = await getCurrentUserAndTenant();
  if (!result) redirect('/login');
  return result;
}
