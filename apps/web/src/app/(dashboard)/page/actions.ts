'use server';

import { randomUUID } from 'node:crypto';

import { prisma } from '@haru/database';
import { revalidatePath } from 'next/cache';

import { requireUserAndTenant } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

// Fotos de capa da vitrine. Mesmo padrão da logo (redimensiona no cliente, upload
// server-side com service role, path SEMPRE prefixado pelo tenant.id), mas várias por
// tenant e mantendo a ORDEM em Tenant.coverImageUrls (índice 0 = principal / carrossel).
const ASSETS_PREFIX = '/storage/v1/object/public/tenant-assets/';
const MAX_COVER_BYTES = 5 * 1024 * 1024;
const MAX_COVERS = 5;

export type CoverResult = { error: string } | { ok: true; urls: string[] };

function pathFromUrl(url: string): string | null {
  const idx = url.indexOf(ASSETS_PREFIX);
  return idx === -1 ? null : url.slice(idx + ASSETS_PREFIX.length);
}

function revalidate(slug: string) {
  revalidatePath('/page');
  revalidatePath(`/${slug}`);
}

export async function uploadCoverImage(formData: FormData): Promise<CoverResult> {
  const { tenant } = await requireUserAndTenant();

  const current = tenant.coverImageUrls ?? [];
  if (current.length >= MAX_COVERS) {
    return { error: `Máximo de ${MAX_COVERS} fotos de capa.` };
  }

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return { error: 'Arquivo ausente' };
  if (file.size > MAX_COVER_BYTES) return { error: 'Imagem muito grande (máx. 5 MB).' };
  if (file.type !== 'image/webp') return { error: 'Formato inválido.' };

  const path = `${tenant.id}/cover-${randomUUID()}.webp`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await getSupabaseAdmin()
    .storage.from('tenant-assets')
    .upload(path, buffer, { contentType: 'image/webp', upsert: true });
  if (error) return { error: error.message };

  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '');
  const url = `${base}${ASSETS_PREFIX}${path}`;
  const urls = [...current, url];

  await prisma.tenant.update({ where: { id: tenant.id }, data: { coverImageUrls: urls } });
  revalidate(tenant.slug);
  return { ok: true, urls };
}

export async function removeCoverImage(url: string): Promise<CoverResult> {
  const { tenant } = await requireUserAndTenant();

  const urls = (tenant.coverImageUrls ?? []).filter((u) => u !== url);
  await prisma.tenant.update({ where: { id: tenant.id }, data: { coverImageUrls: urls } });

  // Apaga o arquivo no Storage (best-effort) só se for da pasta deste tenant.
  const path = pathFromUrl(url);
  if (path && path.startsWith(`${tenant.id}/`)) {
    await getSupabaseAdmin().storage.from('tenant-assets').remove([path]);
  }

  revalidate(tenant.slug);
  return { ok: true, urls };
}

export async function setCoverMain(url: string): Promise<CoverResult> {
  const { tenant } = await requireUserAndTenant();

  const rest = (tenant.coverImageUrls ?? []).filter((u) => u !== url);
  if (rest.length === (tenant.coverImageUrls ?? []).length) {
    return { error: 'Foto não encontrada' };
  }
  const urls = [url, ...rest];
  await prisma.tenant.update({ where: { id: tenant.id }, data: { coverImageUrls: urls } });
  revalidate(tenant.slug);
  return { ok: true, urls };
}
