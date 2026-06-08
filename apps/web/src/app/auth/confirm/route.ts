import { redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';

import { createClient } from '@/lib/supabase/server';

/**
 * Entrada única de verificação dos links de e-mail (recovery / confirmação).
 * Troca o token do link por uma sessão (cookie) no servidor e redireciona para
 * `next`. Lida com os DOIS formatos que o Supabase pode emitir:
 *
 * - `token_hash` + `type`  → magic-link cross-device (template customizado).
 *   verifyOtp não precisa de estado local, funciona em qualquer aparelho.
 * - `code`                 → fluxo PKCE (template padrão do Supabase). Depende
 *   do code_verifier (cookie) gravado quando o reset foi pedido — só funciona
 *   no mesmo navegador. Para cobrir outro aparelho, o template de e-mail precisa
 *   usar o formato token_hash (ver supabase/templates/recovery.html).
 *
 * Fazer isso no servidor (e não no cliente) evita corrida com o StrictMode e com
 * o detectSessionInUrl, e centraliza a verificação num lugar só.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const code = searchParams.get('code');

  // `next` é sempre um caminho interno — barrar URL absoluta evita open redirect.
  const nextParam = searchParams.get('next') ?? '/redefinir-senha';
  const next = nextParam.startsWith('/') ? nextParam : '/redefinir-senha';

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) redirect(next);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as 'recovery',
      token_hash: tokenHash,
    });
    if (!error) redirect(next);
  }

  redirect('/redefinir-senha?error=expirado');
}
