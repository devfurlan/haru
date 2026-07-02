import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { LargeSecureStore } from './large-secure-store';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  throw new Error('Faltam EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY no .env');
}

export const supabase = createClient(url, key, {
  auth: {
    // Sessão cifrada: blob no AsyncStorage + chave AES no SecureStore (Keychain/Keystore).
    // Evita o refresh token em texto puro no sandbox do app. Ver large-secure-store.ts.
    storage: new LargeSecureStore(),
    autoRefreshToken: true,
    persistSession: true,
    // OAuth (Google) usa PKCE: o retorno traz `?code=...` e a gente chama
    // exchangeCodeForSession (ver lib/google-auth.ts). Não afeta o login por senha.
    flowType: 'pkce',
    // A gente parseia o code manualmente do retorno do WebBrowser, não pela URL.
    detectSessionInUrl: false,
  },
});

// O RN não roda timers em background como o browser: liga o auto-refresh quando o app
// está em foco e desliga quando sai, senão a sessão expira sem renovar.
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
