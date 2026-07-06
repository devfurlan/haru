'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { Prisma, prisma, type AppointmentStatus } from '@haru/database';

import { traduzErroSignUp } from '@/lib/auth-errors';
import { removeAvatar, uploadAvatar, validateAvatarBuffer } from '@/lib/avatar-storage';
import { searchDirectory, type DirectoryTenant } from '@/lib/tenant-directory';
import type { AvailableSlot } from '@haru/shared';
import {
  cancelOwnedAppointment,
  loadRebookSlots,
  loadRescheduleSlots,
  rebookOwned,
  rescheduleOwnedAppointment,
} from '@/lib/customer-appointments';
import {
  changeCustomerPhone,
  deleteCustomerAccount,
  sendPhoneChangeCode,
  setCustomerNotifications,
  setCustomerPendingPhone,
  updateCustomerProfileCore,
} from '@/lib/customer';
import { requireCustomerAccount } from '@/lib/customer-auth';
import { withinRateLimitFor } from '@/lib/ratelimit';
import { normalizePhoneBR } from '@haru/shared';
import { safeInternalPath } from '@/lib/safe-redirect';
import { TERMS_VERSION } from '@/lib/legal';
import { createClient } from '@/lib/supabase/server';

export type CustomerActionResult = { error: string } | { ok: true } | undefined;

const PHONE_RE = /^55\d{10,11}$/;

// ---------------------------------------------------------------------------
// Autenticação do cliente (Supabase email/senha, espelhando (auth)/actions.ts).
// ---------------------------------------------------------------------------

// Telefone E.164 do Brasil. Usado na verificação (OTP) que conecta o número à conta.
const phoneE164Schema = z
  .string()
  .min(8, 'Informe seu celular')
  .transform(normalizePhoneBR)
  .refine((v) => PHONE_RE.test(v), { message: 'Celular inválido - confira o DDD' });

const customerSignUpSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter ao menos 8 caracteres'),
  name: z.string().trim().min(2, 'Informe seu nome').max(80),
  // Celular informado no cadastro - guardado como PENDENTE (sem verificação aqui).
  phone: phoneE164Schema,
  acceptTerms: z.literal('on', {
    errorMap: () => ({ message: 'É preciso aceitar os Termos e a Política de Privacidade.' }),
  }),
});

export async function customerSignUp(
  _prev: CustomerActionResult,
  formData: FormData,
): Promise<CustomerActionResult> {
  const parsed = customerSignUpSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    name: formData.get('name'),
    phone: formData.get('phone'),
    acceptTerms: formData.get('acceptTerms'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }
  const { email, password, name, phone } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error || !data.user) {
    return { error: error ? traduzErroSignUp(error) : 'Falha ao criar conta' };
  }

  try {
    // O número entra como PENDENTE (pendingPhone), não como `phone`: a confirmação por
    // OTP acontece depois do login (barra no topo da área logada). Só ao confirmar é
    // que vira `phone` e reivindica o histórico (claim) - sem prova de posse, NUNCA
    // chamar claimContactsByPhone (exporia dados de terceiros, LGPD).
    await prisma.customerAccount.create({
      data: {
        authId: data.user.id,
        email,
        name,
        pendingPhone: phone,
        termsAcceptedAt: new Date(),
        termsVersion: TERMS_VERSION,
      },
    });
  } catch (err) {
    console.error('[customerSignUp] falha ao criar conta do cliente', err);
    return { error: 'Não foi possível criar sua conta' };
  }

  revalidatePath('/', 'layout');
  // Cadastro inline (modal dentro do agendamento): a sessão já foi criada por
  // cookie, então não navegamos pra fora - devolvemos ok pro modal fechar e o
  // cliente seguir confirmando o horário na mesma página, sem perder o progresso.
  if (formData.get('inline')) return { ok: true };
  redirect('/conta');
}

// Login unificado em /login usa a action signIn de (auth)/actions.ts, que já faz o
// cross-route dono/cliente. Não há mais customerSignIn.

export async function customerSignOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}

/**
 * Exclui a conta do cliente (irreversível). O core apaga a conta + favoritos + tokens
 * de push (cascata do schema) e os Contacts viram SetNull (o histórico fica com o
 * negócio); aqui encerramos a sessão e mandamos pro login. Sucesso redireciona - só
 * retorna em caso de erro.
 */
export async function customerDeleteAccount(): Promise<CustomerActionResult> {
  const account = await requireCustomerAccount();
  const result = await deleteCustomerAccount(account);
  if ('error' in result) return { error: result.error };

  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}

// ---------------------------------------------------------------------------
// Perfil (cadastro do cliente). name vai na conta + propaga aos Contacts;
// document/birthDate vivem nos Contacts (a conta não os guarda). phone/email
// são readonly na v1 (trocar telefone exigiria re-claim com verificação).
// ---------------------------------------------------------------------------

export async function customerUpdateProfile(
  _prev: CustomerActionResult,
  formData: FormData,
): Promise<CustomerActionResult> {
  const account = await requireCustomerAccount();

  const result = await updateCustomerProfileCore(account, {
    name: String(formData.get('name') ?? ''),
    document: formData.get('document') != null ? String(formData.get('document')) : undefined,
    birthDate: formData.get('birthDate') != null ? String(formData.get('birthDate')) : undefined,
  });
  if ('error' in result) return { error: result.error };

  revalidatePath('/conta/perfil');
  revalidatePath('/conta');
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Preferências de notificação por e-mail do cliente (confirmação, lembrete,
// remarcação e cancelamento dos próprios agendamentos).
// ---------------------------------------------------------------------------

const notificationsSchema = z.object({
  // Checkbox: presente ("on") = ligado; ausente = desligado.
  appointmentEmailsEnabled: z.preprocess((v) => v === 'on' || v === 'true', z.boolean()),
});

export async function customerUpdateNotifications(
  _prev: CustomerActionResult,
  formData: FormData,
): Promise<CustomerActionResult> {
  const account = await requireCustomerAccount();

  const parsed = notificationsSchema.safeParse({
    appointmentEmailsEnabled: formData.get('appointmentEmailsEnabled'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  await setCustomerNotifications(account, parsed.data.appointmentEmailsEnabled);

  revalidatePath('/conta/perfil');
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Troca de telefone (exige novo OTP - mesma prova de posse do cadastro). O número
// antigo continua vinculado (preserva o histórico); o novo é reivindicado.
// ---------------------------------------------------------------------------

/** Envia o código por SMS para o NOVO número antes de trocar. */
export async function sendCustomerPhoneChangeCode(
  newPhoneRaw: string,
): Promise<CustomerActionResult> {
  const account = await requireCustomerAccount();
  // Cada envio é um SMS pago (Twilio): throttle por conta contra SMS pumping. Mesmo bucket
  // usado pela rota mobile, então o limite é compartilhado por conta nos dois canais.
  if (!(await withinRateLimitFor(account.id, 'send-code-acct', 3, 600))) {
    return { error: 'Muitas tentativas de envio. Aguarde alguns minutos.' };
  }
  const result = await sendPhoneChangeCode(account, newPhoneRaw);
  if ('error' in result) return { error: result.error };
  return { ok: true };
}

export async function customerChangePhone(
  _prev: CustomerActionResult,
  formData: FormData,
): Promise<CustomerActionResult> {
  const account = await requireCustomerAccount();
  // Defesa em profundidade contra brute-force do OTP (mesmo bucket da rota mobile).
  if (!(await withinRateLimitFor(account.id, 'phone-verify', 5, 600))) {
    return { error: 'Muitas tentativas. Aguarde alguns minutos e peça um novo código.' };
  }
  const result = await changeCustomerPhone(
    account,
    String(formData.get('phone') ?? ''),
    String(formData.get('code') ?? ''),
  );
  if ('error' in result) return { error: result.error };

  revalidatePath('/conta/perfil');
  revalidatePath('/conta');
  return { ok: true };
}

/**
 * Salva o WhatsApp (pendente, sem SMS) de quem entrou com Google e ainda não tinha número,
 * e volta pro destino (`next`). Depois disso o agendamento conhece o telefone e nunca mais
 * pede "Seus dados". A confirmação por OTP (claim do histórico) segue sendo opcional/depois.
 */
export async function customerSaveWhatsapp(
  _prev: CustomerActionResult,
  formData: FormData,
): Promise<CustomerActionResult> {
  const account = await requireCustomerAccount();
  const result = await setCustomerPendingPhone(account, String(formData.get('phone') ?? ''));
  if ('error' in result) return { error: result.error };

  revalidatePath('/', 'layout');
  const next = formData.get('next');
  redirect(safeInternalPath(typeof next === 'string' ? next : null, '/conta'));
}

// ---------------------------------------------------------------------------
// Reagendar / cancelar (gate de ownership por customerAccountId).
// ---------------------------------------------------------------------------

// O gate de ownership (getOwnedAppointment) e os cores de reagendar/cancelar/rebook
// vivem em @/lib/customer-appointments - compartilhados com os route handlers do app.

const rescheduleSchema = z.object({
  newStartsAtIso: z
    .string()
    .min(1, 'Selecione data/hora')
    .transform((v) => new Date(v))
    .refine((d) => !Number.isNaN(d.getTime()), { message: 'Data inválida' })
    .refine((d) => d > new Date(), { message: 'Não dá pra remarcar pro passado' }),
});

export async function customerRescheduleAppointment(
  appointmentId: string,
  _prev: CustomerActionResult,
  formData: FormData,
): Promise<CustomerActionResult> {
  const account = await requireCustomerAccount();

  const parsed = rescheduleSchema.safeParse({ newStartsAtIso: formData.get('newStartsAtIso') });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  const result = await rescheduleOwnedAppointment(
    account,
    appointmentId,
    parsed.data.newStartsAtIso,
  );
  if ('error' in result) {
    return { error: result.error };
  }

  revalidatePath('/conta');
  revalidatePath('/conta/agendamentos');
  return { ok: true };
}

export async function customerCancelAppointment(
  appointmentId: string,
): Promise<CustomerActionResult> {
  const account = await requireCustomerAccount();

  const result = await cancelOwnedAppointment(account, appointmentId);
  if ('error' in result) return { error: result.error };

  revalidatePath('/conta');
  revalidatePath('/conta/agendamentos');
  return { ok: true };
}

/**
 * Slots livres pra remarcar um agendamento do cliente. Valida ownership, mantém o
 * mesmo profissional e exclui o próprio agendamento da colisão. Injetada no
 * SlotPicker (mesmo contrato de loadSlots do reschedule do dono).
 */
export async function customerLoadSlots(
  appointmentId: string,
  serviceId: string,
  dateStr: string,
): Promise<AvailableSlot[]> {
  const account = await requireCustomerAccount();
  return loadRescheduleSlots(account, appointmentId, serviceId, dateStr);
}

// ---------------------------------------------------------------------------
// Agendar de novo (1 clique): repete serviço/profissional de um agendamento.
// ---------------------------------------------------------------------------

export type CustomerRebookResult =
  | { error: string }
  | { ok: true; status: AppointmentStatus }
  | undefined;

const rebookSchema = z.object({
  sourceAppointmentId: z.string().min(1),
  slotIso: z
    .string()
    .min(1, 'Selecione um horário')
    .transform((v) => new Date(v))
    .refine((d) => !Number.isNaN(d.getTime()), { message: 'Horário inválido' })
    .refine((d) => d > new Date(), { message: 'Esse horário já passou' }),
});

export async function customerRebook(
  _prev: CustomerRebookResult,
  formData: FormData,
): Promise<CustomerRebookResult> {
  const account = await requireCustomerAccount();
  const parsed = rebookSchema.safeParse({
    sourceAppointmentId: formData.get('sourceAppointmentId'),
    slotIso: formData.get('slotIso'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  const result = await rebookOwned(account, parsed.data.sourceAppointmentId, parsed.data.slotIso);
  if ('error' in result) {
    return { error: result.error };
  }

  revalidatePath('/conta');
  revalidatePath('/conta/agendamentos');
  return { ok: true, status: result.status };
}

/**
 * Slots livres pra "agendar de novo" (agendamento novo, sem exclusão). Mostra a
 * agenda do profissional original. Injetada no SlotPicker.
 */
export async function customerRebookSlots(
  sourceAppointmentId: string,
  serviceId: string,
  dateStr: string,
): Promise<AvailableSlot[]> {
  const account = await requireCustomerAccount();
  return loadRebookSlots(account, sourceAppointmentId, serviceId, dateStr);
}

// ---------------------------------------------------------------------------
// Senha do cliente.
// ---------------------------------------------------------------------------

export type CustomerPasswordResult = { error: string } | { ok: true } | undefined;

const passwordSchema = z
  .object({
    current: z.string().min(1, 'Informe a senha atual'),
    password: z.string().min(8, 'A senha deve ter ao menos 8 caracteres'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'As senhas não conferem',
    path: ['confirm'],
  });

export async function customerChangePassword(
  _prev: CustomerPasswordResult,
  formData: FormData,
): Promise<CustomerPasswordResult> {
  await requireCustomerAccount();

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
    return { error: 'Não foi possível alterar a senha. Tente novamente.' };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Buscar + favoritos (aba "Buscar", paridade com o app mobile). Só camada web fina:
// a busca (Haversine) vive em @/lib/tenant-directory; favoritos usam o mesmo model
// Favorite do endpoint mobile (api/mobile/v1/favorites).
// ---------------------------------------------------------------------------

/** Diretório de estabelecimentos p/ a aba Buscar. Logado (a rota já garante a sessão). */
export async function searchTenants(opts: {
  q?: string;
  lat?: number;
  lng?: number;
}): Promise<DirectoryTenant[]> {
  await requireCustomerAccount();
  return searchDirectory(opts);
}

export type FavoriteItem = {
  tenantId: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  address: string | null;
};

export async function getFavorites(): Promise<FavoriteItem[]> {
  const account = await requireCustomerAccount();
  const rows = await prisma.favorite.findMany({
    where: { customerAccountId: account.id },
    include: {
      tenant: { select: { id: true, name: true, slug: true, logoUrl: true, address: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((f) => ({
    tenantId: f.tenant.id,
    name: f.tenant.name,
    slug: f.tenant.slug,
    logoUrl: f.tenant.logoUrl,
    address: f.tenant.address,
  }));
}

export async function addFavorite(tenantId: string): Promise<CustomerActionResult> {
  const account = await requireCustomerAccount();
  if (!tenantId) return { error: 'Estabelecimento inválido' };
  try {
    await prisma.favorite.create({ data: { customerAccountId: account.id, tenantId } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') return { ok: true }; // já era favorito (idempotente)
      if (err.code === 'P2003') return { error: 'Estabelecimento inválido' };
    }
    throw err;
  }
  return { ok: true };
}

export async function removeFavorite(tenantId: string): Promise<CustomerActionResult> {
  const account = await requireCustomerAccount();
  await prisma.favorite.deleteMany({ where: { customerAccountId: account.id, tenantId } });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Avatar do cliente. A imagem chega já reduzida (canvas no client, ~256px JPEG);
// aqui só validamos os bytes e persistimos. Mesmo storage/campo do endpoint mobile
// (api/mobile/v1/me/avatar) - o guard é o `validateAvatarBuffer` compartilhado.
// ---------------------------------------------------------------------------

export type AvatarResult = { ok: true; avatarUrl: string } | { error: string };

export async function updateAvatar(formData: FormData): Promise<AvatarResult> {
  const account = await requireCustomerAccount();

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return { error: 'Imagem ausente' };

  const buffer = Buffer.from(await file.arrayBuffer());
  const invalid = validateAvatarBuffer(buffer);
  if (invalid) return { error: invalid };

  const uploaded = await uploadAvatar(
    `customers/${account.id}`,
    buffer,
    'jpg',
    'image/jpeg',
    account.avatarUrl,
  );
  if ('error' in uploaded) return { error: uploaded.error };

  await prisma.customerAccount.update({
    where: { id: account.id },
    data: { avatarUrl: uploaded.url },
  });

  revalidatePath('/conta');
  revalidatePath('/conta/perfil');
  return { ok: true, avatarUrl: uploaded.url };
}

export async function removeCustomerAvatar(): Promise<CustomerActionResult> {
  const account = await requireCustomerAccount();
  await removeAvatar(account.avatarUrl);
  await prisma.customerAccount.update({ where: { id: account.id }, data: { avatarUrl: null } });
  revalidatePath('/conta');
  revalidatePath('/conta/perfil');
  return { ok: true };
}
