import { getSupabaseAdmin } from '@/lib/supabase/admin';

// Storage de fotos de perfil (dono/staff e cliente final). Reusa o bucket público
// `tenant-assets` (já existe em prod) em vez de criar um bucket novo - aceita imagens
// até 5 MiB. Upload/remoção sempre server-side com service role (o mesmo motivo da
// logo: o browser/app não tem sessão gravável do Supabase, subiria como anon e a RLS
// barraria). A imagem chega já reduzida do cliente; aqui só persistimos os bytes.
// ponytail: 1 tamanho reduzido (o cliente manda ~128px, que cobre os maiores usos ~66-80px
// com folga de retina). Se precisar de thumb menor pra listas, gerar um segundo arquivo aqui.

const BUCKET = 'tenant-assets';
const PUBLIC_PREFIX = `/storage/v1/object/public/${BUCKET}/`;

/** Extrai o path dentro do bucket a partir da URL pública salva; null se não for do bucket. */
function pathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const idx = url.indexOf(PUBLIC_PREFIX);
  return idx === -1 ? null : url.slice(idx + PUBLIC_PREFIX.length);
}

/**
 * Sobe a nova foto (path prefixado por `prefix`, nome com timestamp p/ furar cache),
 * apaga a antiga (best-effort) e devolve a URL pública. `oldUrl` = avatarUrl atual do
 * registro, pra remover o arquivo substituído do bucket.
 */
export async function uploadAvatar(
  prefix: string,
  buffer: Buffer,
  ext: 'webp' | 'jpg',
  contentType: string,
  oldUrl: string | null | undefined,
): Promise<{ url: string } | { error: string }> {
  const admin = getSupabaseAdmin();
  const path = `${prefix}/avatar-${Date.now()}.${ext}`;

  const { error } = await admin.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType, upsert: true });
  if (error) return { error: error.message };

  // Só apaga a antiga depois do upload novo dar certo (não deixa o usuário sem foto
  // se o upload falhar). Ignora erro de remoção - arquivo órfão não quebra nada.
  const old = pathFromUrl(oldUrl);
  if (old && old !== path) {
    await admin.storage
      .from(BUCKET)
      .remove([old])
      .catch(() => {});
  }

  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '');
  return { url: `${base}${PUBLIC_PREFIX}${path}` };
}

/** Apaga o arquivo da foto atual do bucket (best-effort). Usado ao remover o avatar. */
export async function removeAvatar(url: string | null | undefined): Promise<void> {
  const path = pathFromUrl(url);
  if (!path) return;
  await getSupabaseAdmin()
    .storage.from(BUCKET)
    .remove([path])
    .catch(() => {});
}
