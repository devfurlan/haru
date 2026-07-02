import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { api, ApiError } from './api';
import { supabase } from './supabase';

export type GoogleAuthResult = { ok: true } | { canceled: true } | { error: string };

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

/**
 * Troca o `code` do PKCE por sessão e provisiona o CustomerAccount (idempotente).
 * Chamado pelos dois caminhos de retorno do OAuth: o iOS (via openAuthSessionAsync,
 * acima) e o Android (via deep-link na rota app/auth/callback.tsx). Tolera o code
 * já ter sido trocado pelo outro caminho: se a sessão já existe, segue como sucesso.
 */
export async function completeOAuth(code: string): Promise<GoogleAuthResult> {
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return { error: 'Não foi possível concluir o login com o Google.' };
  }

  try {
    await api.oauthEnsure();
  } catch (e) {
    // Falhou o provisionamento (e-mail já usado por conta de senha, ou rede):
    // desfaz a sessão pra não deixar o app logado sem conta do domínio.
    await supabase.auth.signOut();
    const message =
      e instanceof ApiError && e.status === 409
        ? 'Esse e-mail já tem conta com senha. Entre com sua senha.'
        : 'Não foi possível concluir o login. Tente novamente.';
    return { error: message };
  }

  return { ok: true };
}
