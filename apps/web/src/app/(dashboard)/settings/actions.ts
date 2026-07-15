'use server';

import { Prisma } from '@haru/database';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { prisma } from '@haru/database';
import {
  canAddProfessional,
  canAddReceptionist,
  canConnectOwnWhatsapp,
  getProfessionalUsage,
  getReceptionistUsage,
  hasFeature,
} from '@haru/billing';
import { encryptSecret } from '@haru/payments';

import { requireAdmin, requireUserAndTenant } from '@/lib/auth';
import { removeAvatar, uploadAvatar } from '@/lib/avatar-storage';
import { getBaseUrl } from '@/lib/base-url';
import { geocodeAddress } from '@/lib/geocode';
import { isPublicWebhookUrl } from '@/lib/safe-url';
import { normalizePhoneBR } from '@haru/shared';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { saveWhatsappCredentials } from '@/lib/whatsapp-credentials';
import { sendInviteWhatsapp } from '@/lib/whatsapp-invite';
import { syncWhatsappProfile, uploadWhatsappProfilePicture } from '@/lib/whatsapp-profile';

// Slugs reservados - não podem ser usados como slug de tenant (conflitam com
// rotas conhecidas em apps/web).
const RESERVED_SLUGS = new Set([
  'login',
  'signup',
  'ativar',
  'conta',
  'dashboard',
  'appointments',
  'conversations',
  'schedule',
  'services',
  'settings',
  'account',
  'business',
  'page',
  'team',
  'blog',
  'api',
  'admin',
]);

function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

const tenantSchema = z.object({
  name: z.string().min(2, 'Nome muito curto').max(80),
  slug: z
    .string()
    .min(2, 'Slug muito curto')
    .max(40)
    .regex(/^[a-z0-9-]+$/, 'Slug aceita só minúsculas, dígitos e hífen')
    .refine((v) => !RESERVED_SLUGS.has(v), { message: 'Esse slug é reservado pelo sistema' }),
  address: z
    .string()
    .max(200, 'Endereço muito longo')
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : null)),
  description: z
    .string()
    .max(256, 'Descrição muito longa (máx. 256)')
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : null)),
  whatsappAbout: z
    .string()
    .max(139, 'Status muito longo (máx. 139)')
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : null)),
  email: z
    .string()
    .max(128)
    .email('E-mail inválido')
    .or(z.literal(''))
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : null)),
  // Vitrine (Página pública). segment/about/instagram são opcionais; amenities é
  // tratado à parte (multi-valor) em updateTenant.
  segment: z
    .string()
    .max(40, 'Segmento muito longo')
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : null)),
  about: z
    .string()
    .max(1200, 'Texto muito longo')
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : null)),
  instagram: z
    .string()
    .max(60, 'Handle muito longo')
    .optional()
    .transform((v) => {
      const s = (v ?? '').trim().replace(/^@+/, '');
      return s ? s : null;
    }),
});

// Chaves de comodidade aceitas na vitrine (espelham os chips do editor de /page).
const ALLOWED_AMENITIES = new Set([
  'estacionamento',
  'wifi',
  'acessivel',
  'pix_cartao',
  'ar',
  'cafe',
  'kids',
]);

// lat/lng chegam de inputs hidden (client, forjáveis): só aceita números finitos e
// dentro do território brasileiro. Fora disso -> null, cai no fallback de geocode.
function validCoords(
  latRaw: FormDataEntryValue | null,
  lngRaw: FormDataEntryValue | null,
): { lat: number; lng: number } | null {
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -34 || lat > 6 || lng < -74 || lng > -33) return null;
  return { lat, lng };
}

export type TenantActionResult = { error: string } | { ok: true };

export async function updateTenant(
  _prev: TenantActionResult | undefined,
  formData: FormData,
): Promise<TenantActionResult> {
  const { tenant } = await requireUserAndTenant();

  // null -> undefined nos opcionais: formData.get devolve null p/ campo ausente, e
  // `.optional()` do zod só aceita undefined (não null). Guardamos a ESCRITA por
  // formData.has abaixo (uma tela que não renderiza um campo não deve zerá-lo).
  const parsed = tenantSchema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug'),
    address: formData.get('address') ?? undefined,
    description: formData.get('description') ?? undefined,
    whatsappAbout: formData.get('whatsappAbout') ?? undefined,
    email: formData.get('email') ?? undefined,
    segment: formData.get('segment') ?? undefined,
    about: formData.get('about') ?? undefined,
    instagram: formData.get('instagram') ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  const data: Prisma.TenantUpdateInput = {
    name: parsed.data.name,
    slug: parsed.data.slug,
  };

  // Endereço + coords p/ a busca por proximidade no app. Só mexe se o form trouxe
  // o campo. Sugestão do autocomplete (Photon) traz lat/lng prontos; digitação à
  // mão que mudou o texto cai no fallback Nominatim; endereço vazio zera as coords.
  if (formData.has('address')) {
    data.address = parsed.data.address;
    const picked = validCoords(formData.get('latitude'), formData.get('longitude'));
    if (parsed.data.address == null) {
      data.latitude = null;
      data.longitude = null;
    } else if (picked) {
      data.latitude = picked.lat;
      data.longitude = picked.lng;
    } else if (parsed.data.address !== tenant.address) {
      const g = await geocodeAddress(parsed.data.address);
      data.latitude = g?.lat ?? null;
      data.longitude = g?.lng ?? null;
    }
  }
  if (formData.has('description')) data.description = parsed.data.description;
  if (formData.has('email')) data.email = parsed.data.email;
  if (formData.has('whatsappAbout')) data.whatsappAbout = parsed.data.whatsappAbout;
  if (formData.has('segment')) data.segment = parsed.data.segment;
  if (formData.has('about')) data.about = parsed.data.about;
  if (formData.has('instagram')) data.instagram = parsed.data.instagram;
  // Marcador dedicado: com nenhuma comodidade marcada, getAll é vazio e não dá pra
  // distinguir "form sem o campo" de "nada selecionado". O editor envia amenitiesPresent=1.
  if (formData.has('amenitiesPresent')) {
    data.amenities = [
      ...new Set(
        formData
          .getAll('amenities')
          .map(String)
          .filter((a) => ALLOWED_AMENITIES.has(a)),
      ),
    ];
  }

  let updated;
  try {
    updated = await prisma.tenant.update({ where: { id: tenant.id }, data });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return { error: 'Esse slug já está em uso por outro estabelecimento' };
    }
    throw err;
  }

  // Empurra os campos compatíveis pro perfil comercial do WhatsApp. O helper é
  // tolerante a erro (não lança), então o await não derruba o save se o tenant
  // não tiver WhatsApp conectado ou a Meta recusar - só garante que o push rode
  // antes da request encerrar (serverless corta promises soltas).
  await syncWhatsappProfile(updated, `${await getBaseUrl()}/${updated.slug}`);

  // O nome aparece na sidebar (layout do dashboard); revalida o layout inteiro e a
  // página pública (slug pode ter mudado).
  revalidatePath('/page');
  revalidatePath('/', 'layout');
  revalidatePath(`/${parsed.data.slug}`);
  return { ok: true };
}

// --- Fuso horário -----------------------------------------------------------

const timezoneSchema = z.object({
  timezone: z.string().refine(isValidTimezone, { message: 'Fuso horário inválido' }),
});

export type TimezoneActionResult = { error: string } | { ok: true };

export async function updateTimezone(
  _prev: TimezoneActionResult | undefined,
  formData: FormData,
): Promise<TimezoneActionResult> {
  const { tenant } = await requireAdmin();

  const parsed = timezoneSchema.safeParse({ timezone: formData.get('timezone') });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { timezone: parsed.data.timezone },
  });

  revalidatePath('/settings');
  return { ok: true };
}

// --- Logo do estabelecimento ---------------------------------------------
// O redimensionamento (canvas -> webp quadrada) acontece no cliente, mas o
// UPLOAD é feito aqui no servidor com a service role: o browser não tem sessão
// Supabase acessível ao JS (cookies de auth ficam no servidor), então um upload
// client-side subiria como `anon` e a RLS de escrita do bucket barraria com
// "new row violates row-level security policy". O path é SEMPRE prefixado pelo
// tenant.id deste usuário - nunca confiamos em path vindo do cliente -, então
// não há como gravar na pasta de outro tenant mesmo com a service role.

const LOGO_URL_PREFIX = '/storage/v1/object/public/tenant-assets/';
const MAX_LOGO_BYTES = 5 * 1024 * 1024; // bucket aceita até 5 MiB

export type LogoUploadResult = { error: string } | { ok: true; logoUrl: string };

export async function uploadTenantLogo(formData: FormData): Promise<LogoUploadResult> {
  const { tenant } = await requireUserAndTenant();

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Arquivo da logo ausente' };
  }
  if (file.size > MAX_LOGO_BYTES) {
    return { error: 'Imagem muito grande (máx. 5 MB).' };
  }
  if (file.type !== 'image/webp') {
    return { error: 'Formato inválido.' };
  }

  const path = `${tenant.id}/logo-${Date.now()}.webp`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await getSupabaseAdmin()
    .storage.from('tenant-assets')
    .upload(path, buffer, { contentType: 'image/webp', upsert: true });
  if (uploadError) {
    return { error: uploadError.message };
  }

  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '');
  const logoUrl = `${base}${LOGO_URL_PREFIX}${path}`;

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { logoUrl },
  });

  // Sincroniza a foto do perfil do WhatsApp com o JPEG enviado pelo cliente (a
  // Meta não aceita webp). Best-effort: o helper engole erros e pula se o tenant
  // não tiver WhatsApp ou faltar WHATSAPP_APP_ID.
  const jpeg = formData.get('jpeg');
  if (jpeg instanceof File && jpeg.size > 0 && jpeg.size <= MAX_LOGO_BYTES) {
    await uploadWhatsappProfilePicture(tenant, Buffer.from(await jpeg.arrayBuffer()));
  }

  // A logo aparece na sidebar (layout do dashboard) e na página pública.
  revalidatePath('/page');
  revalidatePath('/', 'layout');
  revalidatePath(`/${tenant.slug}`);
  return { ok: true, logoUrl };
}

export async function removeTenantLogo(): Promise<TenantActionResult> {
  const { tenant } = await requireUserAndTenant();

  // Apaga o arquivo no Storage (best-effort) e zera a URL.
  if (tenant.logoUrl) {
    const marker = LOGO_URL_PREFIX;
    const idx = tenant.logoUrl.indexOf(marker);
    if (idx !== -1) {
      const path = tenant.logoUrl.slice(idx + marker.length);
      if (path.startsWith(`${tenant.id}/`)) {
        // Remoção server-side com service role - mesmo motivo do upload.
        await getSupabaseAdmin().storage.from('tenant-assets').remove([path]);
      }
    }
  }

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { logoUrl: null },
  });

  // A logo aparece na sidebar (layout do dashboard) e na página pública.
  revalidatePath('/page');
  revalidatePath('/', 'layout');
  revalidatePath(`/${tenant.slug}`);
  return { ok: true };
}

// --- Perfil do usuário ----------------------------------------------------

const profileSchema = z.object({
  name: z
    .string()
    .max(80, 'Nome muito longo')
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : null)),
});

export type ProfileActionResult = { error: string } | { ok: true };

export async function updateProfile(
  _prev: ProfileActionResult | undefined,
  formData: FormData,
): Promise<ProfileActionResult> {
  const user = await requireUserAndTenant();

  const parsed = profileSchema.safeParse({ name: formData.get('name') });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { name: parsed.data.name },
  });

  revalidatePath('/account');
  // Layout do dashboard exibe o nome do usuário na sidebar
  revalidatePath('/', 'layout');
  return { ok: true };
}

// --- Foto de perfil do usuário (dono/staff) -------------------------------
// O redimensionamento (canvas -> webp 256px) roda no cliente; o upload é aqui no
// servidor com service role (mesmo motivo da logo do tenant). O path é sempre
// prefixado pelo tenant.id + user.id deste usuário - nunca confiamos em path do
// cliente. Trocar apaga a foto antiga do bucket; remover zera a URL e apaga o arquivo.

const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // avatar reduzido cabe folgado em 2 MB

export async function uploadUserAvatar(formData: FormData): Promise<LogoUploadResult> {
  const user = await requireUserAndTenant();

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Arquivo da foto ausente' };
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return { error: 'Imagem muito grande (máx. 2 MB).' };
  }
  if (file.type !== 'image/webp') {
    return { error: 'Formato inválido.' };
  }

  const uploaded = await uploadAvatar(
    `${user.tenantId}/users/${user.id}`,
    Buffer.from(await file.arrayBuffer()),
    'webp',
    'image/webp',
    user.avatarUrl,
  );
  if ('error' in uploaded) return { error: uploaded.error };

  await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: uploaded.url } });

  revalidatePath('/account');
  revalidatePath('/', 'layout'); // sidebar mostra o avatar do usuário
  return { ok: true, logoUrl: uploaded.url };
}

export async function removeUserAvatar(): Promise<TenantActionResult> {
  const user = await requireUserAndTenant();

  await removeAvatar(user.avatarUrl);
  await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: null } });

  revalidatePath('/account');
  revalidatePath('/', 'layout');
  return { ok: true };
}

// --- Foto de perfil de OUTRO membro (admin gerencia a equipe) --------------
// Mesmo fluxo do avatar próprio, mas o admin sobe a foto de um profissional do
// tenant (aparece no booking web/mobile). Valida que o alvo é do mesmo tenant.

/** Carrega o membro-alvo garantindo que pertence ao tenant do admin. */
async function loadMemberOfAdmin(userId: string) {
  const { tenant } = await requireAdmin();
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.tenantId !== tenant.id) return null;
  return { tenant, target };
}

export async function uploadMemberAvatar(
  userId: string,
  formData: FormData,
): Promise<LogoUploadResult> {
  const ctx = await loadMemberOfAdmin(userId);
  if (!ctx) return { error: 'Usuário não encontrado neste estabelecimento.' };
  const { tenant, target } = ctx;

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Arquivo da foto ausente' };
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return { error: 'Imagem muito grande (máx. 2 MB).' };
  }
  if (file.type !== 'image/webp') {
    return { error: 'Formato inválido.' };
  }

  const uploaded = await uploadAvatar(
    `${tenant.id}/users/${target.id}`,
    Buffer.from(await file.arrayBuffer()),
    'webp',
    'image/webp',
    target.avatarUrl,
  );
  if ('error' in uploaded) return { error: uploaded.error };

  await prisma.user.update({ where: { id: target.id }, data: { avatarUrl: uploaded.url } });

  revalidatePath('/settings');
  return { ok: true, logoUrl: uploaded.url };
}

export async function removeMemberAvatar(userId: string): Promise<TenantActionResult> {
  const ctx = await loadMemberOfAdmin(userId);
  if (!ctx) return { error: 'Usuário não encontrado neste estabelecimento.' };

  await removeAvatar(ctx.target.avatarUrl);
  await prisma.user.update({ where: { id: ctx.target.id }, data: { avatarUrl: null } });

  revalidatePath('/settings');
  return { ok: true };
}

// --- Troca de senha (Supabase Auth) ---------------------------------------

const passwordSchema = z
  .object({
    current: z.string().min(1, 'Informe a senha atual'),
    password: z.string().min(8, 'A senha deve ter ao menos 8 caracteres').max(72),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    path: ['confirm'],
    message: 'As senhas não coincidem',
  });

export type PasswordActionResult = { error: string } | { ok: true };

export async function changePassword(
  _prev: PasswordActionResult | undefined,
  formData: FormData,
): Promise<PasswordActionResult> {
  // Garante sessão válida antes de tocar no Auth
  await requireUserAndTenant();

  const parsed = passwordSchema.safeParse({
    current: formData.get('current'),
    password: formData.get('password'),
    confirm: formData.get('confirm'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  const supabase = await createClient();

  // Supabase não tem "verificar senha"; reautentica com a senha atual antes de trocar.
  const { data: userData } = await supabase.auth.getUser();
  const email = userData.user?.email;
  if (!email) {
    return { error: 'Sessão expirada. Entre novamente.' };
  }
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.current,
  });
  if (signInError) {
    return { error: 'Senha atual incorreta.' };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { error: error.message };
  }

  return { ok: true };
}

export type WhatsappActionResult = { error: string } | { ok: true };

const whatsappSchema = z.object({
  phoneNumberId: z
    .string()
    .min(5, 'phone_number_id obrigatório')
    .regex(/^\d+$/, 'phone_number_id deve ser numérico'),
  businessAccountId: z
    .string()
    .max(64)
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : null)),
  displayPhone: z
    .string()
    .max(20)
    .optional()
    .transform((v) => (v && v.trim() ? v.trim().replace(/\D/g, '') : null))
    .refine((v) => v === null || /^\d{10,15}$/.test(v), {
      message: 'Telefone deve ter de 10 a 15 dígitos (formato E.164)',
    }),
  accessToken: z.string().min(1, 'access_token obrigatório').max(500),
});

export async function connectWhatsapp(
  _prev: WhatsappActionResult | undefined,
  formData: FormData,
): Promise<WhatsappActionResult> {
  const { tenant } = await requireAdmin();

  // Conectar uma WABA própria é a variante "número próprio" do addon Atendente IA (com setup
  // pago) - nunca uma feature avulsa do plano base. Fecha o bypass server-side de conectar
  // WhatsApp sem o addon. (Fluxo de conexão vive em assinatura/atendente-ia.)
  if (!canConnectOwnWhatsapp(tenant.subscription)) {
    return {
      error:
        'Conectar um número próprio de WhatsApp faz parte do addon Atendente IA (número próprio). Ative o addon em Assinatura → Atendente IA para configurar.',
    };
  }

  const parsed = whatsappSchema.safeParse({
    phoneNumberId: formData.get('phoneNumberId'),
    businessAccountId: formData.get('businessAccountId'),
    displayPhone: formData.get('displayPhone'),
    accessToken: formData.get('accessToken'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  const saved = await saveWhatsappCredentials(tenant.id, parsed.data);
  if (!saved.ok) {
    return { error: saved.error };
  }

  revalidatePath('/settings');
  return { ok: true };
}

export async function disconnectWhatsapp(): Promise<WhatsappActionResult> {
  const { tenant } = await requireAdmin();

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      whatsappPhoneNumberId: null,
      whatsappBusinessAccountId: null,
      whatsappAccessToken: null,
      whatsappDisplayPhone: null,
    },
  });

  revalidatePath('/settings');
  return { ok: true };
}

// --- Pagamentos -------------------------------------------------------------

export type PaymentsActionResult = { error: string } | { ok: true };

const paymentsSchema = z.object({
  provider: z.enum(['ASAAS', 'MERCADO_PAGO', 'PAGBANK', 'PAGARME']),
  sandbox: z.preprocess((v) => v === 'on' || v === 'true' || v === true, z.boolean()),
  // Em branco = manter o valor atual (na edição). Por isso é opcional aqui; a
  // obrigatoriedade na conexão nova é checada no corpo da action.
  credential: z
    .string()
    .max(500)
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : null)),
  webhookToken: z
    .string()
    .max(200)
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : null)),
});

export async function connectPaymentGateway(
  _prev: PaymentsActionResult | undefined,
  formData: FormData,
): Promise<PaymentsActionResult> {
  const { tenant } = await requireAdmin();

  if (!hasFeature(tenant.subscription, 'onlinePayments')) {
    return {
      error:
        'Pagamentos online estão disponíveis a partir do plano Time. Faça upgrade para ativar.',
    };
  }

  const parsed = paymentsSchema.safeParse({
    provider: formData.get('provider'),
    sandbox: formData.get('sandbox'),
    credential: formData.get('credential'),
    webhookToken: formData.get('webhookToken'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  const { provider, sandbox, credential, webhookToken } = parsed.data;

  // Credencial cifrada já salva PARA O PROVIDER escolhido (null se nenhum / outro provider).
  // Editar sem trocar de provider e sem redigitar a credencial deve preservá-la - o form
  // mostra os campos vazios (são senhas), então campo em branco = "manter o que está lá".
  const currentCredEnc =
    provider === tenant.paymentProvider
      ? provider === 'ASAAS'
        ? tenant.paymentAsaasApiKeyEnc
        : provider === 'MERCADO_PAGO'
          ? tenant.paymentMercadoPagoTokenEnc
          : provider === 'PAGBANK'
            ? tenant.paymentPagBankTokenEnc
            : tenant.paymentPagarmeApiKeyEnc
      : null;

  // Credencial: usa a nova (cifrada) se veio do form; senão mantém a atual do provider.
  // Trocar de provider zera o reuso - a credencial salva é de outro gateway.
  const credEnc = credential ? encryptSecret(credential) : currentCredEnc;
  if (!credEnc) {
    return { error: 'Informe a credencial do gateway' };
  }

  // Token do webhook: em branco preserva o atual (não apaga sem querer). Trocar de
  // provider também descarta o token antigo, que pertencia ao gateway anterior.
  const tokenEnc = webhookToken
    ? encryptSecret(webhookToken)
    : provider === tenant.paymentProvider
      ? tenant.paymentWebhookTokenEnc
      : null;
  // Token do webhook é obrigatório: sem ele o callback do gateway não tem como ser
  // autenticado e passa a ser recusado (fail-closed) - confirmações de pagamento parariam.
  if (!tokenEnc) {
    return {
      error:
        'Informe o token de validação do webhook do gateway - ele é obrigatório para receber confirmações de pagamento com segurança.',
    };
  }

  // Grava só a credencial do provider escolhido e zera as demais - um provider ativo por vez.
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      paymentProvider: provider,
      paymentSandbox: sandbox,
      paymentWebhookTokenEnc: tokenEnc,
      paymentAsaasApiKeyEnc: provider === 'ASAAS' ? credEnc : null,
      paymentMercadoPagoTokenEnc: provider === 'MERCADO_PAGO' ? credEnc : null,
      paymentPagBankTokenEnc: provider === 'PAGBANK' ? credEnc : null,
      paymentPagarmeApiKeyEnc: provider === 'PAGARME' ? credEnc : null,
    },
  });

  revalidatePath('/settings');
  return { ok: true };
}

export async function disconnectPaymentGateway(): Promise<PaymentsActionResult> {
  const { tenant } = await requireAdmin();

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      paymentProvider: null,
      paymentSandbox: false,
      paymentAsaasApiKeyEnc: null,
      paymentMercadoPagoTokenEnc: null,
      paymentPagBankTokenEnc: null,
      paymentPagarmeApiKeyEnc: null,
      paymentWebhookTokenEnc: null,
    },
  });

  revalidatePath('/settings');
  return { ok: true };
}

const templateNameSchema = z
  .string()
  .max(80)
  .optional()
  .transform((v) => (v && v.trim() ? v.trim() : null))
  .refine((v) => v === null || /^[a-z0-9_]+$/.test(v), {
    message: 'Template name aceita só minúsculas, dígitos e underscore',
  });

const templateLanguageSchema = z
  .string()
  .max(10)
  .optional()
  .transform((v) => (v && v.trim() ? v.trim() : null));

const notificationsSchema = z
  .object({
    notificationWebhookUrl: z
      .string()
      .max(500)
      .optional()
      .transform((v) => (v && v.trim() ? v.trim() : null))
      .refine((v) => v === null || /^https:\/\//i.test(v), {
        message: 'URL deve começar com https://',
      }),
    reminderMinutesBefore: z
      .string()
      .min(1, 'Informe quantos minutos antes (0 desativa)')
      .transform((v) => Number(v))
      .refine((n) => Number.isInteger(n) && n >= 0 && n <= 10080, {
        message: 'Use um valor entre 0 e 10080 (uma semana em minutos)',
      }),
    reminderTemplateName: templateNameSchema,
    reminderTemplateLanguage: templateLanguageSchema,
    cancelTemplateName: templateNameSchema,
    cancelTemplateLanguage: templateLanguageSchema,
    rescheduleTemplateName: templateNameSchema,
    rescheduleTemplateLanguage: templateLanguageSchema,
  })
  .superRefine((data, ctx) => {
    const checks: Array<[string, string | null, string | null]> = [
      ['reminder', data.reminderTemplateName, data.reminderTemplateLanguage],
      ['cancel', data.cancelTemplateName, data.cancelTemplateLanguage],
      ['reschedule', data.rescheduleTemplateName, data.rescheduleTemplateLanguage],
    ];
    for (const [prefix, name, language] of checks) {
      if (name && !language) {
        ctx.addIssue({
          code: 'custom',
          path: [`${prefix}TemplateLanguage`],
          message: `Defina o idioma do template ${prefix} (ex: pt_BR)`,
        });
      }
    }
  });

export type NotificationsActionResult = { error: string } | { ok: true };

export async function updateNotifications(
  _prev: NotificationsActionResult | undefined,
  formData: FormData,
): Promise<NotificationsActionResult> {
  const { tenant } = await requireAdmin();

  const parsed = notificationsSchema.safeParse({
    // Campo é escondido em planos sem webhooks; ausente vira null, mas o schema é
    // `.optional()` (aceita undefined, não null) - coage pra não quebrar o save.
    notificationWebhookUrl: formData.get('notificationWebhookUrl') ?? undefined,
    reminderMinutesBefore: formData.get('reminderMinutesBefore'),
    reminderTemplateName: formData.get('reminderTemplateName'),
    reminderTemplateLanguage: formData.get('reminderTemplateLanguage'),
    cancelTemplateName: formData.get('cancelTemplateName'),
    cancelTemplateLanguage: formData.get('cancelTemplateLanguage'),
    rescheduleTemplateName: formData.get('rescheduleTemplateName'),
    rescheduleTemplateLanguage: formData.get('rescheduleTemplateLanguage'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  // Só o webhook de notificações é gated; lembretes/templates ficam livres em todos os planos.
  if (parsed.data.notificationWebhookUrl && !hasFeature(tenant.subscription, 'webhooks')) {
    return {
      error:
        'Webhooks de notificação estão disponíveis a partir do plano Time. Faça upgrade para ativar.',
    };
  }

  // Anti-SSRF: o webhook só pode apontar pra um host público (https:443). Bloqueia
  // loopback/rede interna/metadata de cloud - senão cada evento viraria um POST server-side
  // pra dentro da infra.
  if (
    parsed.data.notificationWebhookUrl &&
    !(await isPublicWebhookUrl(parsed.data.notificationWebhookUrl))
  ) {
    return {
      error: 'URL de webhook inválida: use um endereço https público (não rede interna).',
    };
  }

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      notificationWebhookUrl: parsed.data.notificationWebhookUrl,
      reminderMinutesBefore: parsed.data.reminderMinutesBefore,
      reminderTemplateName: parsed.data.reminderTemplateName,
      reminderTemplateLanguage: parsed.data.reminderTemplateLanguage,
      cancelTemplateName: parsed.data.cancelTemplateName,
      cancelTemplateLanguage: parsed.data.cancelTemplateLanguage,
      rescheduleTemplateName: parsed.data.rescheduleTemplateName,
      rescheduleTemplateLanguage: parsed.data.rescheduleTemplateLanguage,
    },
  });

  revalidatePath('/settings');
  return { ok: true };
}

// Toggles de aviso pro dono (card "Avisos"): salvam na hora, sem botão. Allowlist
// fecha a escrita a estes três campos - nunca um nome de coluna vindo do cliente.
const OWNER_NOTIFICATION_FIELDS = [
  'handoffEmailEnabled',
  'ownerAppointmentEmailsEnabled',
  'ownerWhatsappAlertsEnabled',
] as const;
export type OwnerNotificationField = (typeof OWNER_NOTIFICATION_FIELDS)[number];

export async function toggleOwnerNotification(
  field: OwnerNotificationField,
  enabled: boolean,
): Promise<NotificationsActionResult> {
  const { tenant } = await requireAdmin();
  if (!OWNER_NOTIFICATION_FIELDS.includes(field)) {
    return { error: 'Campo inválido' };
  }

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { [field]: enabled },
  });

  revalidatePath('/settings');
  return { ok: true };
}

// --- Agendamento online (página pública /[slug]) --------------------------

const publicBookingSchema = z.object({
  // Checkbox: presente ("on") = ligado; ausente = desligado.
  enabled: z.preprocess((v) => v === 'on' || v === 'true', z.boolean()),
  confirmation: z.enum(['PENDING', 'CONFIRMED']),
});

export type PublicBookingActionResult = { error: string } | { ok: true };

export async function updatePublicBooking(
  _prev: PublicBookingActionResult | undefined,
  formData: FormData,
): Promise<PublicBookingActionResult> {
  const { tenant } = await requireAdmin();

  const parsed = publicBookingSchema.safeParse({
    enabled: formData.get('enabled'),
    confirmation: formData.get('confirmation'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      publicBookingEnabled: parsed.data.enabled,
      publicBookingConfirmation: parsed.data.confirmation,
    },
  });

  revalidatePath('/settings');
  revalidatePath('/page');
  revalidatePath('/', 'layout'); // status "No ar" na sidebar depende disto
  revalidatePath(`/${tenant.slug}`);
  return { ok: true };
}

// --- Gestão de usuários do estabelecimento (só admin/OWNER) ----------------

/**
 * Gera o link de ativação que o convidado abre para definir a senha. Usa o
 * fluxo `recovery` do Supabase, que exige um auth.users já existente (o caller
 * cria via auth.admin.createUser ANTES de chamar isto). Retorna um token_hash
 * que a tela /ativar troca por sessão (verifyOtp). Null em caso de falha.
 */
async function buildActivationLink(email: string): Promise<string | null> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.admin.generateLink({ type: 'recovery', email });
  if (error || !data.properties?.hashed_token) {
    console.error('[users] falha ao gerar link de ativação:', error?.message);
    return null;
  }
  const baseUrl = await getBaseUrl();
  const params = new URLSearchParams({
    token_hash: data.properties.hashed_token,
    type: 'recovery',
  });
  return `${baseUrl}/ativar?${params.toString()}`;
}

function traduzErroCriarUser(message?: string): string {
  if (message && /already.*registered|already.*exists|duplicate/i.test(message)) {
    return 'Já existe um usuário com este email.';
  }
  return 'Não foi possível criar o usuário.';
}

const phoneSchema = z
  .string()
  .min(1, 'Telefone obrigatório')
  .transform(normalizePhoneBR)
  .refine((v) => /^55\d{10,11}$/.test(v), {
    message: 'Telefone inválido. Use DDD + número (ex.: 11 91234-5678).',
  });

/** "true"/"on" -> profissional (com agenda); resto -> recepcionista (sem agenda). */
const isProfessionalField = z.preprocess(
  (v) => v === 'true' || v === 'on' || v === true,
  z.boolean(),
);

const inviteUserSchema = z.object({
  name: z.string().min(2, 'Nome muito curto').max(80),
  email: z.string().email('Email inválido'),
  phone: phoneSchema,
  isProfessional: isProfessionalField,
});

export type InviteUserActionResult =
  | { error: string }
  | { ok: true; sent: boolean; activationUrl: string };

export async function inviteUser(
  _prev: InviteUserActionResult | undefined,
  formData: FormData,
): Promise<InviteUserActionResult> {
  const { tenant } = await requireAdmin();

  const parsed = inviteUserSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    isProfessional: formData.get('isProfessional'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }
  const { name, email, phone, isProfessional } = parsed.data;

  // Gate de equipe: feature do plano + teto da categoria escolhida (snapshot da
  // assinatura). Profissionais (com agenda) e recepcionistas (apoio) têm tetos
  // independentes.
  if (!hasFeature(tenant.subscription, 'team')) {
    return {
      error:
        'Equipe (mais de um usuário) está disponível a partir do plano Time. Faça upgrade para convidar.',
    };
  }
  const sub = tenant.subscription;
  if (isProfessional) {
    const used = await getProfessionalUsage(tenant.id);
    if (!canAddProfessional(sub, used)) {
      return {
        error: `Seu plano permite até ${sub?.maxProfessionals ?? 0} profissionais (com agenda). Faça upgrade para adicionar mais.`,
      };
    }
  } else {
    const used = await getReceptionistUsage(tenant.id);
    if (!canAddReceptionist(sub, used)) {
      return {
        error: `Seu plano permite até ${sub?.maxReceptionists ?? 0} recepcionistas (sem agenda). Faça upgrade para adicionar mais.`,
      };
    }
  }

  const admin = getSupabaseAdmin();

  // 1) Cria o auth.users sem senha (email confirmado - ativação define a senha).
  const created = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (created.error || !created.data.user) {
    return { error: traduzErroCriarUser(created.error?.message) };
  }
  const authId = created.data.user.id;

  // 2) Cria o User no Postgres. Se falhar (ex.: email já existe), faz rollback do
  //    auth.users recém-criado pra não deixar órfão.
  try {
    await prisma.user.create({
      data: {
        authId,
        email,
        name,
        phone,
        role: 'STAFF',
        isProfessional,
        status: 'INVITED',
        invitedAt: new Date(),
        tenantId: tenant.id,
      },
    });
  } catch (err) {
    await admin.auth.admin.deleteUser(authId).catch(() => {});
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return { error: 'Já existe um usuário com este email.' };
    }
    throw err;
  }

  // 3) Gera o link de ativação e tenta enviar por WhatsApp. Se falhar aqui, o
  //    usuário fica criado como INVITED - o admin recupera pelo botão "Reenviar
  //    convite" (resendInvite gera um link novo). Não desfazemos a criação pra
  //    não obrigar a redigitar os dados por uma falha transiente de API.
  const activationUrl = await buildActivationLink(email);
  if (!activationUrl) {
    revalidatePath('/settings');
    return {
      error:
        'Usuário criado, mas falhou ao gerar o link de ativação. Use "Reenviar convite" para tentar de novo.',
    };
  }

  const sent = await sendInviteWhatsapp({
    tenant,
    toPhone: phone,
    inviteeName: name,
    activationUrl,
  });

  revalidatePath('/settings');
  return { ok: true, sent, activationUrl };
}

const updateUserSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(2, 'Nome muito curto').max(80),
  phone: phoneSchema,
  role: z.enum(['OWNER', 'STAFF']),
  isProfessional: isProfessionalField,
});

export type UserActionResult = { error: string } | { ok: true };

export async function updateUser(
  _prev: UserActionResult | undefined,
  formData: FormData,
): Promise<UserActionResult> {
  const admin = await requireAdmin();
  const { tenant } = admin;

  const parsed = updateUserSchema.safeParse({
    userId: formData.get('userId'),
    name: formData.get('name'),
    phone: formData.get('phone'),
    role: formData.get('role'),
    isProfessional: formData.get('isProfessional'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }
  const { userId, name, phone, role, isProfessional } = parsed.data;

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.tenantId !== tenant.id) {
    return { error: 'Usuário não encontrado neste estabelecimento.' };
  }

  // O admin não pode alterar o próprio papel (evita auto-rebaixamento que o
  // deixaria sem acesso a estas configurações).
  if (userId === admin.id && role !== admin.role) {
    return { error: 'Você não pode alterar o seu próprio papel.' };
  }

  // Não permitir rebaixar o último OWNER do estabelecimento.
  if (target.role === 'OWNER' && role !== 'OWNER') {
    const owners = await prisma.user.count({ where: { tenantId: tenant.id, role: 'OWNER' } });
    if (owners <= 1) {
      return { error: 'O estabelecimento precisa de pelo menos um administrador.' };
    }
  }

  // Mudou de categoria: valida o teto do destino. O `target` ainda está na
  // categoria de origem, então a contagem do destino não o inclui.
  if (isProfessional !== target.isProfessional) {
    if (isProfessional) {
      const used = await getProfessionalUsage(tenant.id);
      if (!canAddProfessional(tenant.subscription, used)) {
        return {
          error: `Seu plano permite até ${tenant.subscription?.maxProfessionals ?? 0} profissionais (com agenda).`,
        };
      }
    } else {
      const used = await getReceptionistUsage(tenant.id);
      if (!canAddReceptionist(tenant.subscription, used)) {
        return {
          error: `Seu plano permite até ${tenant.subscription?.maxReceptionists ?? 0} recepcionistas (sem agenda).`,
        };
      }
    }
  }

  await prisma.user.update({ where: { id: userId }, data: { name, phone, role, isProfessional } });

  revalidatePath('/settings');
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function deleteUser(userId: string): Promise<UserActionResult> {
  const admin = await requireAdmin();
  const { tenant } = admin;

  if (userId === admin.id) {
    return { error: 'Você não pode excluir a si mesmo.' };
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.tenantId !== tenant.id) {
    return { error: 'Usuário não encontrado neste estabelecimento.' };
  }

  if (target.role === 'OWNER') {
    const owners = await prisma.user.count({ where: { tenantId: tenant.id, role: 'OWNER' } });
    if (owners <= 1) {
      return { error: 'O estabelecimento precisa de pelo menos um administrador.' };
    }
  }

  await prisma.user.delete({ where: { id: userId } });
  // Best-effort: remove o auth.users correspondente. Logamos a falha pra não
  // silenciar uma conta órfã no Supabase Auth (dificultaria troubleshooting).
  await getSupabaseAdmin()
    .auth.admin.deleteUser(target.authId)
    .catch((err) =>
      console.error(
        `[users] falha ao remover auth.users ${target.authId} de ${target.email}:`,
        err,
      ),
    );

  revalidatePath('/settings');
  return { ok: true };
}

export type ResendInviteActionResult =
  | { error: string }
  | { ok: true; sent: boolean; activationUrl: string };

export async function resendInvite(userId: string): Promise<ResendInviteActionResult> {
  const { tenant } = await requireAdmin();

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.tenantId !== tenant.id) {
    return { error: 'Usuário não encontrado neste estabelecimento.' };
  }
  if (target.status !== 'INVITED') {
    return { error: 'Este usuário já ativou a conta.' };
  }

  const activationUrl = await buildActivationLink(target.email);
  if (!activationUrl) {
    return { error: 'Falhou ao gerar o link de ativação. Tente de novo.' };
  }

  await prisma.user.update({ where: { id: userId }, data: { invitedAt: new Date() } });

  const sent = target.phone
    ? await sendInviteWhatsapp({
        tenant,
        toPhone: target.phone,
        inviteeName: target.name ?? '',
        activationUrl,
      })
    : false;

  revalidatePath('/settings');
  return { ok: true, sent, activationUrl };
}
