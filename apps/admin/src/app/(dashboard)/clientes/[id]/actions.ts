'use server';

import { Prisma, prisma } from '@haru/database';
import type { SubscriptionStatus } from '@haru/database';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireAdmin } from '@/lib/admin-auth';
import { snapshotPlan } from '@/lib/billing-lite';
import { encryptSecret } from '@/lib/crypto';

export type FormResult = { error: string } | { ok: true };

const RESERVED_SLUGS = new Set([
  'login',
  'signup',
  'ativar',
  'dashboard',
  'appointments',
  'conversations',
  'schedule',
  'services',
  'settings',
  'account',
  'business',
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

function done(tenantId: string): FormResult {
  revalidatePath(`/clientes/${tenantId}`);
  return { ok: true };
}

// --- Perfil do negócio ------------------------------------------------------

const profileSchema = z.object({
  name: z.string().min(2, 'Nome muito curto').max(80),
  slug: z
    .string()
    .min(2, 'Slug muito curto')
    .max(40)
    .regex(/^[a-z0-9-]+$/, 'Slug aceita só minúsculas, dígitos e hífen')
    .refine((v) => !RESERVED_SLUGS.has(v), { message: 'Esse slug é reservado pelo sistema' }),
  address: emptyToNull(200, 'Endereço muito longo'),
  description: emptyToNull(256, 'Descrição muito longa (máx. 256)'),
  whatsappAbout: emptyToNull(139, 'Status muito longo (máx. 139)'),
  email: z
    .string()
    .max(128)
    .email('E-mail inválido')
    .or(z.literal(''))
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : null)),
});

function emptyToNull(max: number, msg: string) {
  return z
    .string()
    .max(max, msg)
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : null));
}

export async function updateProfile(
  _prev: FormResult | undefined,
  formData: FormData,
): Promise<FormResult> {
  await requireAdmin();
  const tenantId = String(formData.get('tenantId'));

  const parsed = profileSchema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug'),
    address: formData.get('address'),
    description: formData.get('description'),
    whatsappAbout: formData.get('whatsappAbout'),
    email: formData.get('email'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  try {
    await prisma.tenant.update({ where: { id: tenantId }, data: parsed.data });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return { error: 'Esse slug já está em uso por outro estabelecimento' };
    }
    throw err;
  }
  return done(tenantId);
}

// --- Operação (fuso + agendamento público + notificações/templates) ---------

const templateName = z
  .string()
  .max(80)
  .optional()
  .transform((v) => (v && v.trim() ? v.trim() : null))
  .refine((v) => v === null || /^[a-z0-9_]+$/.test(v), {
    message: 'Template name aceita só minúsculas, dígitos e underscore',
  });
const templateLang = z
  .string()
  .max(10)
  .optional()
  .transform((v) => (v && v.trim() ? v.trim() : null));

const operationSchema = z
  .object({
    timezone: z.string().refine(isValidTimezone, { message: 'Fuso horário inválido' }),
    publicBookingEnabled: z.preprocess((v) => v === 'on' || v === 'true', z.boolean()),
    publicBookingConfirmation: z.enum(['PENDING', 'CONFIRMED']),
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
    reminderTemplateName: templateName,
    reminderTemplateLanguage: templateLang,
    cancelTemplateName: templateName,
    cancelTemplateLanguage: templateLang,
    rescheduleTemplateName: templateName,
    rescheduleTemplateLanguage: templateLang,
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

export async function updateOperation(
  _prev: FormResult | undefined,
  formData: FormData,
): Promise<FormResult> {
  await requireAdmin();
  const tenantId = String(formData.get('tenantId'));

  const parsed = operationSchema.safeParse({
    timezone: formData.get('timezone'),
    publicBookingEnabled: formData.get('publicBookingEnabled'),
    publicBookingConfirmation: formData.get('publicBookingConfirmation'),
    notificationWebhookUrl: formData.get('notificationWebhookUrl'),
    reminderHoursBefore: formData.get('reminderHoursBefore'),
    reminderTemplateName: formData.get('reminderTemplateName'),
    reminderTemplateLanguage: formData.get('reminderTemplateLanguage'),
    cancelTemplateName: formData.get('cancelTemplateName'),
    cancelTemplateLanguage: formData.get('cancelTemplateLanguage'),
    rescheduleTemplateName: formData.get('rescheduleTemplateName'),
    rescheduleTemplateLanguage: formData.get('rescheduleTemplateLanguage'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  await prisma.tenant.update({ where: { id: tenantId }, data: parsed.data });
  return done(tenantId);
}

// --- WhatsApp ---------------------------------------------------------------

const whatsappSchema = z.object({
  phoneNumberId: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : null))
    .refine((v) => v === null || /^\d+$/.test(v), {
      message: 'phone_number_id deve ser numérico',
    }),
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
  accessToken: z
    .string()
    .max(500)
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : null)),
});

export async function updateWhatsapp(
  _prev: FormResult | undefined,
  formData: FormData,
): Promise<FormResult> {
  await requireAdmin();
  const tenantId = String(formData.get('tenantId'));

  const parsed = whatsappSchema.safeParse({
    phoneNumberId: formData.get('phoneNumberId'),
    businessAccountId: formData.get('businessAccountId'),
    displayPhone: formData.get('displayPhone'),
    accessToken: formData.get('accessToken'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const { phoneNumberId, businessAccountId, displayPhone, accessToken } = parsed.data;

  // Sem phone_number_id => desconecta (zera tudo).
  if (!phoneNumberId) {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        whatsappPhoneNumberId: null,
        whatsappBusinessAccountId: null,
        whatsappDisplayPhone: null,
        whatsappAccessToken: null,
      },
    });
    return done(tenantId);
  }

  // Token em branco = mantém o atual (campo é mascarado). Só cifra quando vier um token
  // NOVO do form; o atual já está cifrado no banco e é regravado como está.
  const current = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { whatsappAccessToken: true },
  });
  const token = accessToken ? encryptSecret(accessToken) : (current?.whatsappAccessToken ?? null);
  if (!token) return { error: 'Informe o access_token na primeira conexão' };

  try {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        whatsappPhoneNumberId: phoneNumberId,
        whatsappBusinessAccountId: businessAccountId,
        whatsappDisplayPhone: displayPhone,
        whatsappAccessToken: token,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return { error: 'Esse phone_number_id já está vinculado a outro estabelecimento' };
    }
    throw err;
  }
  return done(tenantId);
}

// --- Pagamentos -------------------------------------------------------------

const paymentsSchema = z.object({
  provider: z.enum(['', 'ASAAS', 'MERCADO_PAGO', 'PAGBANK', 'PAGARME']),
  sandbox: z.preprocess((v) => v === 'on' || v === 'true', z.boolean()),
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

export async function updatePayments(
  _prev: FormResult | undefined,
  formData: FormData,
): Promise<FormResult> {
  await requireAdmin();
  const tenantId = String(formData.get('tenantId'));

  const parsed = paymentsSchema.safeParse({
    provider: formData.get('provider') ?? '',
    sandbox: formData.get('sandbox'),
    credential: formData.get('credential'),
    webhookToken: formData.get('webhookToken'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const { provider, sandbox, credential, webhookToken } = parsed.data;

  // Provider vazio => desativa pagamentos (zera tudo).
  if (!provider) {
    await prisma.tenant.update({
      where: { id: tenantId },
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
    return done(tenantId);
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return { error: 'Cliente não encontrado' };

  // Credencial atual do provider escolhido (pra preservar quando o campo vier em branco).
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

  const credEnc = credential ? encryptSecret(credential) : currentCredEnc;
  if (!credEnc) return { error: 'Informe a credencial do gateway' };

  const tokenEnc = webhookToken
    ? encryptSecret(webhookToken)
    : provider === tenant.paymentProvider
      ? tenant.paymentWebhookTokenEnc
      : null;
  // Token do webhook obrigatório: sem ele o callback do gateway é recusado (fail-closed),
  // então confirmações de pagamento parariam. Não deixa ativar provider sem token.
  if (!tokenEnc) return { error: 'Informe o token de validação do webhook do gateway.' };

  await prisma.tenant.update({
    where: { id: tenantId },
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
  return done(tenantId);
}

// --- Plano / assinatura -----------------------------------------------------

const planSchema = z.object({
  planTier: z.enum(['ESSENCIAL', 'PROFISSIONAL', 'NEGOCIO', 'ENTERPRISE']),
  status: z.enum(['PENDING', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELED']),
  billingCycle: z.enum(['MONTHLY', 'ANNUAL']),
});

export async function updatePlan(
  _prev: FormResult | undefined,
  formData: FormData,
): Promise<FormResult> {
  await requireAdmin();
  const tenantId = String(formData.get('tenantId'));

  const parsed = planSchema.safeParse({
    planTier: formData.get('planTier'),
    status: formData.get('status'),
    billingCycle: formData.get('billingCycle'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const { planTier, status, billingCycle } = parsed.data;

  const existing = await prisma.subscription.findUnique({ where: { tenantId } });
  if (!existing) {
    return {
      error: 'Este cliente não tem assinatura (criar do zero está fora do escopo do admin).',
    };
  }

  const plan = await prisma.plan.findUnique({ where: { tier: planTier } });
  if (!plan) return { error: 'Plano não encontrado no catálogo' };

  const snap = snapshotPlan(plan, billingCycle);

  await prisma.subscription.update({
    where: { tenantId },
    data: {
      planTier,
      status,
      billingCycle,
      canceledAt: status === 'CANCELED' ? (existing.canceledAt ?? new Date()) : null,
      ...snap,
    },
  });
  return done(tenantId);
}

// --- Limites da assinatura (override manual por tenant) ---------------------

/** Limite opcional: vazio = ilimitado (null); senão inteiro >= 0. */
const optionalLimit = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() ? Number(v) : null))
  .refine((n) => n === null || (Number.isInteger(n) && n >= 0), {
    message: 'Limite inválido (use um inteiro ou deixe vazio para ilimitado)',
  });

const limitsSchema = z.object({
  maxProfessionals: optionalLimit,
  maxReceptionists: optionalLimit,
});

/**
 * Edita os tetos de equipe (profissionais/recepcionistas) direto no snapshot da
 * assinatura. É um OVERRIDE manual: sobrevive a re-snapshot só até a próxima troca
 * de plano (que regrava do catálogo). Permite liberar capacidade pra um cliente
 * específico sem mexer no plano de todo mundo.
 */
export async function updateSubscriptionLimits(
  _prev: FormResult | undefined,
  formData: FormData,
): Promise<FormResult> {
  await requireAdmin();
  const tenantId = String(formData.get('tenantId'));

  const parsed = limitsSchema.safeParse({
    maxProfessionals: formData.get('maxProfessionals'),
    maxReceptionists: formData.get('maxReceptionists'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const existing = await prisma.subscription.findUnique({ where: { tenantId } });
  if (!existing) {
    return { error: 'Este cliente não tem assinatura.' };
  }

  await prisma.subscription.update({
    where: { tenantId },
    data: {
      maxProfessionals: parsed.data.maxProfessionals,
      maxReceptionists: parsed.data.maxReceptionists,
    },
  });
  return done(tenantId);
}

// --- Equipe (trocar papel) --------------------------------------------------

const roleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['OWNER', 'STAFF']),
});

export async function updateUserRole(
  _prev: FormResult | undefined,
  formData: FormData,
): Promise<FormResult> {
  await requireAdmin();
  const tenantId = String(formData.get('tenantId'));

  const parsed = roleSchema.safeParse({
    userId: formData.get('userId'),
    role: formData.get('role'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const { userId, role } = parsed.data;
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.tenantId !== tenantId) {
    return { error: 'Usuário não encontrado neste estabelecimento.' };
  }

  // Não deixar o estabelecimento sem nenhum OWNER.
  if (target.role === 'OWNER' && role !== 'OWNER') {
    const owners = await prisma.user.count({ where: { tenantId, role: 'OWNER' } });
    if (owners <= 1) return { error: 'O estabelecimento precisa de pelo menos um administrador.' };
  }

  await prisma.user.update({ where: { id: userId }, data: { role } });
  return done(tenantId);
}

// Reexport para o status (suspender/ativar a partir do detalhe, se necessário).
export type { SubscriptionStatus };
