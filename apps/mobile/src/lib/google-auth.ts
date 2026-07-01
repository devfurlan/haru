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
  if (res.type !== 'success') return { canceled: true }; // usuário fechou/cancelou

  const code = Linking.parse(res.url).queryParams?.code;
  if (typeof code !== 'string') return { error: 'Retorno do Google inválido.' };

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) return { error: 'Não foi possível concluir o login com o Google.' };

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
