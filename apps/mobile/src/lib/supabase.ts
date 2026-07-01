import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  throw new Error('Faltam EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY no .env');
}

export const supabase = createClient(url, key, {
  auth: {
    // ponytail: sessão em AsyncStorage (sandbox do app). SecureStore tem limite de ~2KB
    // por valor e o token da sessão costuma passar disso; endurecer com LargeSecureStore
    // (aes-js + SecureStore p/ a chave) se o rigor exigir.
    storage: AsyncStorage,
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
