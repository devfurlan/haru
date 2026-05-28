import { createClient } from '@supabase/supabase-js';

import { env } from './env.js';

export const BOT_MEDIA_BUCKET = 'bot-media';

let _client: ReturnType<typeof createClient> | null = null;

function client() {
  if (!_client) {
    _client = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _client;
}

export function getSupabaseClient() {
  return client();
}

function extensionFromMime(mimeType: string): string {
  const m = mimeType.toLowerCase();
  if (m.includes('ogg')) return 'ogg';
  if (m.includes('mp4') || m.includes('aac')) return 'm4a';
  if (m.includes('mpeg')) return 'mp3';
  if (m.includes('wav')) return 'wav';
  if (m.includes('webm')) return 'webm';
  return 'bin';
}

/**
 * Sobe o áudio recebido pro bucket `bot-media`. Retorna o path (ou null se
 * falhou — caller deve tratar como não-bloqueante).
 */
export async function uploadBotAudio(
  buffer: Buffer,
  mimeType: string,
  whatsappMessageId: string,
): Promise<string | null> {
  const path = `audio/${whatsappMessageId}.${extensionFromMime(mimeType)}`;
  const { error } = await client().storage.from(BOT_MEDIA_BUCKET).upload(path, buffer, {
    contentType: mimeType,
    upsert: true,
  });
  if (error) {
    console.error('[bot-media] falha ao subir áudio:', error.message);
    return null;
  }
  return path;
}
