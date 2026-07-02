import { redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';

import { ensureCustomerAccount } from '@/lib/customer-auth';
import { safeInternalPath } from '@/lib/safe-redirect';
import { createClient } from '@/lib/supabase/server';

/**
 * Retorno do OAuth (Google) da ÁREA DO CLIENTE. O provider volta com `?code=...`;
 * a gente troca por sessão (cookie) no servidor e garante o CustomerAccount do
 * domínio - o mesmo botão serve login e cadastro. Espelha /auth/confirm (que faz o
 * mesmo exchange pros links de e-mail), mas provisiona a conta do cliente.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  // `next` é sempre caminho interno - barrar URL absoluta/protocol-relative evita open redirect.
  const next = safeInternalPath(searchParams.get('next'), '/conta');

  if (!code) redirect('/conta/entrar?error=oauth');

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) redirect('/conta/entrar?error=oauth');

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/conta/entrar?error=oauth');

  const result = await ensureCustomerAccount(user);
  if ('error' in result) {
    // E-mail já tem conta com senha (outro authId): desloga e manda entrar com senha.
    await supabase.auth.signOut();
    redirect('/conta/entrar?error=email-existente');
  }

  redirect(next);
}
