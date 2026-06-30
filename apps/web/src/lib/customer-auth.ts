import { cache } from 'react';
import { redirect } from 'next/navigation';

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
