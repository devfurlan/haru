import { cache } from 'react';
import { redirect } from 'next/navigation';

import { createClient } from './supabase/server';

/** Allowlist de operadores (ADMIN_EMAILS, CSV), normalizada em minúsculas. */
function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Usuário do Supabase Auth, mas SÓ se o e-mail estiver na allowlist. Caso
 * contrário retorna `null` (mesmo logado). Envolto em `cache()` pra deduplicar
 * dentro do mesmo render (layout + página chamam no mesmo request).
 */
export const getAdminUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email?.toLowerCase();
  if (!email || !adminEmails().includes(email)) return null;
  return user;
});

/**
 * Exige um operador da allowlist. Redireciona pra /login se não autenticado, ou
 * pra /login?error=forbidden se logado mas fora da allowlist (a tela de login
 * trata esse caso oferecendo sair).
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const email = user.email?.toLowerCase();
  if (!email || !adminEmails().includes(email)) redirect('/login?error=forbidden');

  return user;
}
