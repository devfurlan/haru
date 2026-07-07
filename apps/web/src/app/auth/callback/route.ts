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

  if (!code) redirect('/login?error=oauth');

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) redirect('/login?error=oauth');

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?error=oauth');

  const result = await ensureCustomerAccount(user);
  if ('error' in result) {
    // E-mail já tem conta com senha (outro authId): desloga e manda entrar com senha.
    await supabase.auth.signOut();
    redirect('/login?error=email-existente');
  }

  // Google não informa telefone. LOGO APÓS O CADASTRO (conta nova sem número), oferece
  // uma vez o mini-onboarding pra adicionar o WhatsApp - é opcional e pulável (a própria
  // tela tem "Pular por agora"). Nunca barra: quem pula segue normal, agenda sem WhatsApp
  // (é confirmado por e-mail/app). Em logins recorrentes (created=false) não reempurra.
  const account = result.ok;
  if (result.created && !account.phone && !account.pendingPhone) {
    redirect(`/conta/whatsapp?next=${encodeURIComponent(next)}`);
  }

  redirect(next);
}
