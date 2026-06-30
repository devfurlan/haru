'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { prisma, type AppointmentStatus } from '@haru/database';

import {
  cancelAppointmentCore,
  createBookingCore,
  rescheduleAppointmentCore,
} from '@/lib/appointment-mutations';
import { traduzErroSignUp } from '@/lib/auth-errors';
import type { AvailableSlot } from '@/lib/availability';
import { BOOKING_HORIZON_DAYS, isoDateInTz } from '@/lib/booking-days';
import { requireCustomerAccount } from '@/lib/customer-auth';
import { claimContactsByPhone } from '@/lib/customer-claim';
import { isValidCpfCnpj, normalizePhoneBR, onlyDigits } from '@/lib/format';
import { TERMS_VERSION } from '@/lib/legal';
import { getServiceDaySlots, resolveBookingProfessional } from '@/lib/professionals';
import { createClient } from '@/lib/supabase/server';
import { checkPhoneOtp, sendPhoneOtp } from '@/lib/twilio-verify';

export type CustomerActionResult = { error: string } | { ok: true } | undefined;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
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
  redirect('/conta');
}

const customerSignInSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
});

export async function customerSignIn(
  _prev: CustomerActionResult,
  formData: FormData,
): Promise<CustomerActionResult> {
  const parsed = customerSignInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    return { error: 'Credenciais inválidas' };
  }

  // Esta é a entrada de quem agenda. Se a sessão for de um dono/equipe (só tem
  // User), manda pro painel em vez de prender aqui.
  const account = await prisma.customerAccount.findUnique({
    where: { authId: data.user.id },
  });
  if (!account) {
    const user = await prisma.user.findUnique({ where: { authId: data.user.id } });
    if (user) {
      revalidatePath('/', 'layout');
      redirect('/dashboard');
    }
    // Sessão sem vínculo no domínio (caso raro/órfão): encerra e avisa.
    await supabase.auth.signOut();
    return { error: 'Não encontramos uma conta de agendamentos para este acesso.' };
  }

  revalidatePath('/', 'layout');
  redirect('/conta');
}

export async function customerSignOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/conta/entrar');
}

// ---------------------------------------------------------------------------
// Perfil (cadastro do cliente). name vai na conta + propaga aos Contacts;
// document/birthDate vivem nos Contacts (a conta não os guarda). phone/email
// são readonly na v1 (trocar telefone exigiria re-claim com verificação).
// ---------------------------------------------------------------------------

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome').max(80),
  document: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : '')),
  birthDate: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : '')),
});

export async function customerUpdateProfile(
  _prev: CustomerActionResult,
  formData: FormData,
): Promise<CustomerActionResult> {
  const account = await requireCustomerAccount();

  const parsed = profileSchema.safeParse({
    name: formData.get('name'),
    document: formData.get('document'),
    birthDate: formData.get('birthDate'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }
  const { name } = parsed.data;

  let documentDigits: string | undefined;
  if (parsed.data.document) {
    if (!isValidCpfCnpj(parsed.data.document)) {
      return { error: 'CPF/CNPJ inválido' };
    }
    documentDigits = onlyDigits(parsed.data.document);
  }

  let birthDate: Date | undefined;
  if (parsed.data.birthDate) {
    if (!DATE_RE.test(parsed.data.birthDate)) {
      return { error: 'Data de nascimento inválida' };
    }
    const d = new Date(`${parsed.data.birthDate}T00:00:00.000Z`);
    if (Number.isNaN(d.getTime())) {
      return { error: 'Data de nascimento inválida' };
    }
    birthDate = d;
  }

  await prisma.customerAccount.update({
    where: { id: account.id },
    data: { name },
  });

  // Propaga aos Contacts vinculados (mantém o painel do dono em sincronia). Só
  // sobrescreve document/birthDate quando informados (não apaga o que já existe).
  await prisma.contact.updateMany({
    where: { customerAccountId: account.id },
    data: {
      name,
      ...(documentDigits ? { document: documentDigits } : {}),
      ...(birthDate ? { birthDate } : {}),
    },
  });

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

  await prisma.customerAccount.update({
    where: { id: account.id },
    data: { appointmentEmailsEnabled: parsed.data.appointmentEmailsEnabled },
  });

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
  const parsed = phoneE164Schema.safeParse(newPhoneRaw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Celular inválido' };
  }
  const newPhone = parsed.data;
  if (newPhone === account.phone) {
    return { error: 'Este já é o seu número atual.' };
  }
  const taken = await prisma.customerAccount.findFirst({
    where: { phone: newPhone, id: { not: account.id } },
    select: { id: true },
  });
  if (taken) {
    return { error: 'Este número já está em uso por outra conta.' };
  }
  const res = await sendPhoneOtp(newPhone);
  if (!res.ok) return { error: res.error };
  return { ok: true };
}

const changePhoneSchema = z.object({
  phone: phoneE164Schema,
  code: z
    .string()
    .min(4, 'Informe o código recebido por SMS')
    .transform((v) => v.replace(/\D/g, '')),
});

export async function customerChangePhone(
  _prev: CustomerActionResult,
  formData: FormData,
): Promise<CustomerActionResult> {
  const account = await requireCustomerAccount();
  const parsed = changePhoneSchema.safeParse({
    phone: formData.get('phone'),
    code: formData.get('code'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }
  const { phone, code } = parsed.data;
  if (phone === account.phone) {
    return { error: 'Este já é o seu número atual.' };
  }
  const taken = await prisma.customerAccount.findFirst({
    where: { phone, id: { not: account.id } },
    select: { id: true },
  });
  if (taken) {
    return { error: 'Este número já está em uso por outra conta.' };
  }

  // Prova de posse do NOVO número antes de associar/reivindicar.
  const verified = await checkPhoneOtp(phone, code);
  if (!verified.ok) {
    return { error: verified.error };
  }

  await prisma.customerAccount.update({
    where: { id: account.id },
    // Número confirmado vira o `phone` oficial; limpa o pendente do cadastro.
    data: { phone, pendingPhone: null },
  });
  // Reivindica os Contacts do novo número. Não desvincula os do antigo - assim o
  // cliente mantém o histórico de agendamentos que já tinha.
  await claimContactsByPhone(account.id, phone);

  revalidatePath('/conta/perfil');
  revalidatePath('/conta');
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Reagendar / cancelar (gate de ownership por customerAccountId).
// ---------------------------------------------------------------------------

/**
 * Carrega um agendamento garantindo que pertence ao cliente logado (via o Contact
 * vinculado). Filtra no `where` - nunca confia em id vindo do client. null = não é
 * do cliente / não existe.
 */
async function getOwnedAppointment(customerAccountId: string, appointmentId: string) {
  return prisma.appointment.findFirst({
    where: { id: appointmentId, contact: { customerAccountId } },
    select: {
      id: true,
      tenantId: true,
      serviceId: true,
      professionalId: true,
      contactId: true,
      status: true,
      service: { select: { durationMinutes: true, active: true } },
      tenant: {
        select: { timezone: true, publicBookingEnabled: true, publicBookingConfirmation: true },
      },
    },
  });
}

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
  const appt = await getOwnedAppointment(account.id, appointmentId);
  if (!appt) return { error: 'Agendamento não encontrado' };

  const parsed = rescheduleSchema.safeParse({ newStartsAtIso: formData.get('newStartsAtIso') });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  const result = await rescheduleAppointmentCore({
    appointmentId: appt.id,
    tenantId: appt.tenantId,
    newStartsAt: parsed.data.newStartsAtIso,
    // O cliente remarcou ele mesmo: avisa o DONO por e-mail, não o próprio cliente.
    notifyCustomer: false,
    notifyOwner: true,
  });
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
  const appt = await getOwnedAppointment(account.id, appointmentId);
  if (!appt) return { error: 'Agendamento não encontrado' };

  // O cliente cancelou ele mesmo: avisa o dono (webhook, dentro do core), mas não
  // dispara o template de "cancelado" pro próprio cliente - ele acabou de cancelar.
  const changed = await cancelAppointmentCore({
    appointmentId: appt.id,
    tenantId: appt.tenantId,
    notifyClient: false,
    // ...mas avisa o DONO por e-mail que o cliente cancelou.
    notifyOwner: true,
  });
  if (!changed) return { error: 'Não foi possível cancelar este agendamento' };

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
  if (!DATE_RE.test(dateStr)) return [];
  const account = await requireCustomerAccount();
  const appt = await getOwnedAppointment(account.id, appointmentId);
  if (!appt || appt.serviceId !== serviceId) return [];

  return getServiceDaySlots({
    tenantId: appt.tenantId,
    serviceId: appt.serviceId,
    tz: appt.tenant.timezone,
    durationMinutes: appt.service.durationMinutes,
    dateStr,
    now: new Date(),
    professionalId: appt.professionalId,
    excludeAppointmentId: appt.id,
  });
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

  const source = await getOwnedAppointment(account.id, parsed.data.sourceAppointmentId);
  if (!source) return { error: 'Agendamento não encontrado' };
  if (!source.tenant.publicBookingEnabled) {
    return { error: 'Este estabelecimento não está aceitando agendamentos online.' };
  }
  if (!source.service.active) {
    return { error: 'Este serviço não está mais disponível.' };
  }

  const startsAt = parsed.data.slotIso;
  const dateStr = isoDateInTz(startsAt, source.tenant.timezone);

  // Resolve o profissional revalidando o slot no servidor. Prioriza o profissional
  // original; se ele não estiver livre nesse horário, cai pra "sem preferência".
  let resolved = await resolveBookingProfessional({
    tenantId: source.tenantId,
    serviceId: source.serviceId,
    tz: source.tenant.timezone,
    durationMinutes: source.service.durationMinutes,
    startsAt,
    dateStr,
    now: new Date(),
    requestedProfessionalId: source.professionalId,
  });
  if (!resolved.ok) {
    resolved = await resolveBookingProfessional({
      tenantId: source.tenantId,
      serviceId: source.serviceId,
      tz: source.tenant.timezone,
      durationMinutes: source.service.durationMinutes,
      startsAt,
      dateStr,
      now: new Date(),
      requestedProfessionalId: undefined,
    });
  }
  if (!resolved.ok) {
    return { error: resolved.reason };
  }

  const status = source.tenant.publicBookingConfirmation as unknown as AppointmentStatus;
  const result = await createBookingCore({
    tenantId: source.tenantId,
    contactId: source.contactId,
    serviceId: source.serviceId,
    professionalId: resolved.professionalId,
    startsAt,
    durationMinutes: source.service.durationMinutes,
    status,
  });
  if ('error' in result) {
    return { error: result.error };
  }

  revalidatePath('/conta');
  revalidatePath('/conta/agendamentos');
  return { ok: true, status };
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
  if (!DATE_RE.test(dateStr)) return [];
  const account = await requireCustomerAccount();
  const source = await getOwnedAppointment(account.id, sourceAppointmentId);
  if (!source || source.serviceId !== serviceId) return [];

  // Janela permitida: nem no passado, nem além do horizonte de agendamento.
  const today = isoDateInTz(new Date(), source.tenant.timezone);
  const maxDate = isoDateInTz(
    new Date(Date.now() + (BOOKING_HORIZON_DAYS - 1) * 86_400_000),
    source.tenant.timezone,
  );
  if (dateStr < today || dateStr > maxDate) return [];

  return getServiceDaySlots({
    tenantId: source.tenantId,
    serviceId: source.serviceId,
    tz: source.tenant.timezone,
    durationMinutes: source.service.durationMinutes,
    dateStr,
    now: new Date(),
    professionalId: source.professionalId,
  });
}

// ---------------------------------------------------------------------------
// Senha do cliente.
// ---------------------------------------------------------------------------

export type CustomerPasswordResult = { error: string } | { ok: true } | undefined;

const passwordSchema = z
  .object({
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
    password: formData.get('password'),
    confirm: formData.get('confirm'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { error: 'Não foi possível alterar a senha. Tente novamente.' };
  }
  return { ok: true };
}
