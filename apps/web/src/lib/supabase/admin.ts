import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente Supabase com a service role key (SUPABASE_SECRET_KEY). Tem poder de
 * admin sobre o Auth - criar/excluir usuários, gerar links de ativação. NUNCA
 * importe isto de um client component: a chave não tem prefixo NEXT_PUBLIC_,
 * então só existe no servidor. Espelha o cliente admin do bot
 * (apps/bot/src/lib/supabase.ts).
 */
let _client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    throw new Error(
      'SUPABASE admin indisponível: defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY no ambiente do web.',
    );
  }

  _client = createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _client;
}
