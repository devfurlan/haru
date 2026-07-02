import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { api, ApiError } from './api';
import { supabase } from './supabase';

export type GoogleAuthResult =
  | { ok: true }
  | { canceled: true }
  | { error: string; detail?: string };

/**
 * Login/cadastro com Google no app (fluxo PKCE do Supabase):
 * 1. pede a URL de autorização (skipBrowserRedirect - a gente abre o browser);
 * 2. abre a sessão de auth no navegador do sistema e espera o retorno demandae://;
 * 3. troca o `code` do retorno por sessão (grava no AsyncStorage);
 * 4. garante o CustomerAccount no backend (idempotente).
 * O onAuthStateChange (lib/auth) leva pro app quando a sessão aparece.
 */
export async function signInWithGoogle(): Promise<GoogleAuthResult> {
  const redirectTo = Linking.createURL('auth/callback'); // demandae://auth/callback

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data?.url) {
    return { error: 'Não foi possível iniciar o login com o Google.' };
  }

  const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  // No Android o retorno demandae:// costuma ser roteado pelo SO como deep-link
  // (cai em app/auth/callback.tsx, que chama completeOAuth). Aqui o browser volta
  // como 'dismiss'/'cancel' - não é erro, o callback assume. Só o iOS costuma
  // capturar o code aqui mesmo.
  if (res.type !== 'success') return { canceled: true };

  const code = Linking.parse(res.url).queryParams?.code;
  if (typeof code !== 'string') return { error: 'Retorno do Google inválido.' };

  return completeOAuth(code);
}

// Dedupe: no Android o openAuthSessionAsync e o deep-link (callback.tsx) podem chamar
// completeOAuth com o MESMO code. O code do PKCE é uso único - trocar duas vezes faz a
// segunda falhar. Compartilhando a mesma Promise por code, a troca roda exatamente uma
// vez pros dois caminhos. ponytail: o Map só cresce (1 entrada por tentativa de login),
// desprezível na vida do processo; limpar se um dia virar loop de retry.
const inflight = new Map<string, Promise<GoogleAuthResult>>();

/**
 * Troca o `code` do PKCE por sessão e provisiona o CustomerAccount (idempotente).
 * Chamado pelos dois caminhos de retorno do OAuth: o iOS (via openAuthSessionAsync,
 * acima) e o Android (via deep-link na rota app/auth/callback.tsx). Deduplicado por
 * code pra nunca trocar o mesmo code duas vezes.
 */
export function completeOAuth(code: string): Promise<GoogleAuthResult> {
  let p = inflight.get(code);
  if (!p) {
    p = runCompleteOAuth(code);
    inflight.set(code, p);
  }
  return p;
}

async function runCompleteOAuth(code: string): Promise<GoogleAuthResult> {
  // exchangeCodeForSession pode LANÇAR (verifier ausente) ou retornar { error } (code
  // inválido/já usado) - captura os dois pro diagnóstico (`detail`).
  let exchangeErr: string | null = null;
  try {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error)
      exchangeErr = `${error.message} (status=${(error as { status?: number }).status ?? '?'} code=${(error as { code?: string }).code ?? '?'})`;
  } catch (e) {
    exchangeErr = `throw: ${(e as Error)?.message ?? String(e)}`;
  }
  if (exchangeErr) {
    const { data } = await supabase.auth.getSession();
    if (!data.session)
      return { error: 'Não foi possível concluir o login com o Google.', detail: 'exchange: ' + exchangeErr };
  }

  try {
    await api.oauthEnsure();
  } catch (e) {
    // Falhou o provisionamento (e-mail já usado por conta de senha, ou rede):
    // desfaz a sessão pra não deixar o app logado sem conta do domínio.
    await supabase.auth.signOut();
    const status = e instanceof ApiError ? e.status : undefined;
    const message =
      status === 409
        ? 'Esse e-mail já tem conta com senha. Entre com sua senha.'
        : 'Não foi possível concluir o login. Tente novamente.';
    return { error: message, detail: `oauthEnsure: status=${status} ${(e as Error)?.message ?? ''}` };
  }

  return { ok: true };
}
