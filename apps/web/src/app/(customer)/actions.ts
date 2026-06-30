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

export type CustomerActionResult = { error: string } | { ok: true } | undefined;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PHONE_RE = /^55\d{10,11}$/;

// ---------------------------------------------------------------------------
// Autenticação do cliente (Supabase email/senha, espelhando (auth)/actions.ts).
// ---------------------------------------------------------------------------

const customerSignUpSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter ao menos 8 caracteres'),
  name: z.string().trim().min(2, 'Informe seu nome').max(80),
  // Telefone é o elo da conta com o histórico (claim cross-tenant) - obrigatório.
  phone: z
    .string()
    .min(8, 'Informe seu WhatsApp')
    .transform(normalizePhoneBR)
    .refine((v) => PHONE_RE.test(v), { message: 'WhatsApp inválido - confira o DDD' }),
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
    const account = await prisma.customerAccount.create({
      data: {
        authId: data.user.id,
        email,
        name,
        phone,
        termsAcceptedAt: new Date(),
        termsVersion: TERMS_VERSION,
      },
    });
    // Vincula os Contacts deste telefone (em todos os estabelecimentos) à conta.
    await claimContactsByPhone(account.id, phone);
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

  // A sessão pode ser de um DONO (User) sem conta de cliente. Não misturamos
  // identidades: encerra a sessão e orienta a usar o painel.
  const account = await prisma.customerAccount.findUnique({
    where: { authId: data.user.id },
  });
  if (!account) {
    await supabase.auth.signOut();
    return {
      error: 'Esta conta não tem área do cliente. Se você é dono, acesse o painel em /login.',
    };
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
