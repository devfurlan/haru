import { cache } from 'react';
import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';

import { createClient } from './supabase/server';

/**
 * É admin quem tem `is_admin: true` no `app_metadata` do Supabase Auth. Esse
 * campo só pode ser definido pelo servidor (service role / Admin API), nunca
 * pelo próprio usuário - por isso serve como flag de permissão confiável. Viaja
 * no JWT da sessão, então não exige consulta a banco nem allowlist em env.
 */
export function isAdmin(user: User | null): boolean {
  return user?.app_metadata?.is_admin === true;
}

/**
 * Usuário do Supabase Auth, mas SÓ se for admin. Caso contrário `null` (mesmo
 * logado). Envolto em `cache()` pra deduplicar dentro do mesmo render.
 */
export const getAdminUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return isAdmin(user) ? user : null;
});

/**
 * Exige um admin. Redireciona pra /login se não autenticado, ou pra
 * /login?error=forbidden se logado mas sem a flag de admin (a tela de login
 * trata esse caso oferecendo sair).
 */
export async function requireAdmin(): Promise<User> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');
  if (!isAdmin(user)) redirect('/login?error=forbidden');

  return user;
}
