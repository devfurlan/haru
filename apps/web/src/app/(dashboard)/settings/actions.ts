'use server';

import { Prisma } from '@haru/database';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { prisma } from '@haru/database';

import { requireUserAndTenant } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

// Slugs reservados — não podem ser usados como slug de tenant (conflitam com
// rotas conhecidas em apps/web).
const RESERVED_SLUGS = new Set([
  'login',
  'signup',
  'dashboard',
  'appointments',
  'conversations',
  'schedule',
  'services',
  'settings',
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
  timezone: z.string().refine(isValidTimezone, { message: 'Fuso horário inválido' }),
  address: z
    .string()
    .max(200, 'Endereço muito longo')
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : null)),
});

export type TenantActionResult = { error: string } | { ok: true };

export async function updateTenant(
  _prev: TenantActionResult | undefined,
  formData: FormData,
): Promise<TenantActionResult> {
  const { tenant } = await requireUserAndTenant();

  const parsed = tenantSchema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug'),
    timezone: formData.get('timezone'),
    address: formData.get('address'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  try {
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: parsed.data,
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return { error: 'Esse slug já está em uso por outro estabelecimento' };
    }
    throw err;
  }

  // Slug mudou? Revalida a página pública também. O nome aparece na sidebar
  // (layout do dashboard), então revalida o layout inteiro.
  revalidatePath('/business');
  revalidatePath('/', 'layout');
  revalidatePath(`/${parsed.data.slug}`);
  return { ok: true };
}

// --- Logo do estabelecimento ---------------------------------------------
// O upload em si acontece no cliente (canvas redimensiona pra quadrada e envia
// direto pro bucket público tenant-assets). Estas actions só persistem/limpam a
// URL no Tenant, sempre prefixando o path pelo tenant.id pra evitar que um
// tenant grave URL de asset de outro.

const LOGO_URL_PREFIX = '/storage/v1/object/public/tenant-assets/';

const logoSchema = z.object({
  // Path dentro do bucket, ex: "<tenantId>/logo-<timestamp>.webp"
  path: z
    .string()
    .min(1, 'Caminho da logo ausente')
    .max(300)
    .regex(/^[a-zA-Z0-9/_.-]+$/, 'Caminho inválido'),
});

export async function saveTenantLogo(
  _prev: TenantActionResult | undefined,
  formData: FormData,
): Promise<TenantActionResult> {
  const { tenant } = await requireUserAndTenant();

  const parsed = logoSchema.safeParse({ path: formData.get('path') });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  // Garante que o path pertence a este tenant (cliente envia o path retornado
  // pelo upload, mas não confiamos cegamente).
  if (!parsed.data.path.startsWith(`${tenant.id}/`)) {
    return { error: 'Caminho da logo não pertence a este estabelecimento' };
  }

  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '');
  const logoUrl = `${base}${LOGO_URL_PREFIX}${parsed.data.path}`;

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { logoUrl },
  });

  // A logo aparece na sidebar (layout do dashboard) e na página pública.
  revalidatePath('/business');
  revalidatePath('/', 'layout');
  revalidatePath(`/${tenant.slug}`);
  return { ok: true };
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
        const supabase = await createClient();
        await supabase.storage.from('tenant-assets').remove([path]);
      }
    }
  }

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { logoUrl: null },
  });

  // A logo aparece na sidebar (layout do dashboard) e na página pública.
  revalidatePath('/business');
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

// --- Troca de senha (Supabase Auth) ---------------------------------------

const passwordSchema = z
  .object({
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
    password: formData.get('password'),
    confirm: formData.get('confirm'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  const supabase = await createClient();
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
  const { tenant } = await requireUserAndTenant();

  const parsed = whatsappSchema.safeParse({
    phoneNumberId: formData.get('phoneNumberId'),
    businessAccountId: formData.get('businessAccountId'),
    displayPhone: formData.get('displayPhone'),
    accessToken: formData.get('accessToken'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  try {
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        whatsappPhoneNumberId: parsed.data.phoneNumberId,
        whatsappBusinessAccountId: parsed.data.businessAccountId,
        whatsappDisplayPhone: parsed.data.displayPhone,
        whatsappAccessToken: parsed.data.accessToken,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return { error: 'Esse phone_number_id já está vinculado a outro estabelecimento' };
    }
    throw err;
  }

  revalidatePath('/settings');
  return { ok: true };
}

export async function disconnectWhatsapp(): Promise<WhatsappActionResult> {
  const { tenant } = await requireUserAndTenant();

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
    reminderHoursBefore: z
      .string()
      .min(1, 'Informe quantas horas antes (0 desativa)')
      .transform((v) => Number(v))
      .refine((n) => Number.isInteger(n) && n >= 0 && n <= 168, {
        message: 'Use um valor entre 0 e 168 (uma semana)',
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
  const { tenant } = await requireUserAndTenant();

  const parsed = notificationsSchema.safeParse({
    notificationWebhookUrl: formData.get('notificationWebhookUrl'),
    reminderHoursBefore: formData.get('reminderHoursBefore'),
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

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      notificationWebhookUrl: parsed.data.notificationWebhookUrl,
      reminderHoursBefore: parsed.data.reminderHoursBefore,
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
  const { tenant } = await requireUserAndTenant();

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
  revalidatePath(`/${tenant.slug}`);
  return { ok: true };
}
