import { prisma } from '@haru/database';
import type { AppointmentStatus, CustomerAccount, PaymentStatus } from '@haru/database';

import { isoDateInTz, isValidCpfCnpj, normalizePhoneBR, onlyDigits } from '@haru/shared';
import { decryptNullable, encryptSecret } from '@haru/payments';

import { claimContactsByPhone } from '@/lib/customer-claim';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { checkPhoneOtp, sendPhoneOtp } from '@/lib/twilio-verify';

// Leituras da ÁREA DO CLIENTE. Cross-tenant: parte dos Contacts vinculados à conta
// (customerAccountId) e busca os agendamentos por contactId. O gate de ownership é o
// próprio `customerAccountId` - nada vem de id do client.

export interface CustomerAppointmentItem {
  id: string;
  serviceId: string;
  serviceName: string;
  serviceActive: boolean;
  durationMinutes: number;
  priceCents: number;
  professionalName: string | null;
  /** Instante UTC; formatar sempre no `tenant.timezone`. */
  startsAt: Date;
  /** Já formatado no fuso do tenant (a UI é cross-tenant, cada item num fuso). */
  whenLabel: string;
  status: AppointmentStatus;
  seriesId: string | null;
  tenant: {
    id: string;
    name: string;
    slug: string;
    timezone: string;
    logoUrl: string | null;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
  };
  /** Dias com expediente do profissional (pra remarcar / agendar de novo). */
  openWeekdays: number[];
  /** Dia atual do agendamento (YYYY-MM-DD no fuso do tenant) - pré-seleção. */
  currentDateStr: string;
  isPast: boolean;
  /** Futuro e ainda ativo (PENDING/CONFIRMED) - pode remarcar/cancelar. */
  isActive: boolean;
  payment: { status: PaymentStatus; amountCents: number } | null;
}

export interface CustomerAppointmentsData {
  upcoming: CustomerAppointmentItem[];
  past: CustomerAppointmentItem[];
}

function formatWhen(date: Date, tz: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: tz,
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Todos os agendamentos do cliente (em todos os estabelecimentos), separados em
 * futuros (asc) e passados (desc). Inclui serviço, profissional, tenant (com fuso),
 * o pagamento mais recente e os dias de expediente do profissional - tudo que as
 * telas e os modais de remarcar/agendar-de-novo precisam.
 */
export async function getCustomerAppointments(
  account: CustomerAccount,
): Promise<CustomerAppointmentsData> {
  const contacts = await prisma.contact.findMany({
    where: { customerAccountId: account.id },
    select: { id: true },
  });
  const contactIds = contacts.map((c) => c.id);
  if (contactIds.length === 0) return { upcoming: [], past: [] };

  const appts = await prisma.appointment.findMany({
    where: { contactId: { in: contactIds } },
    include: {
      service: { select: { name: true, durationMinutes: true, priceCents: true, active: true } },
      professional: { select: { name: true } },
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
          timezone: true,
          logoUrl: true,
          address: true,
          latitude: true,
          longitude: true,
        },
      },
      payments: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { status: true, amountCents: true },
      },
    },
    orderBy: { startsAt: 'desc' },
  });

  // Dias de expediente por profissional (pra remarcar / agendar de novo).
  const professionalIds = [...new Set(appts.map((a) => a.professionalId))];
  const blocks = professionalIds.length
    ? await prisma.scheduleBlock.findMany({
        where: { professionalId: { in: professionalIds } },
        select: { professionalId: true, weekday: true },
      })
    : [];
  const weekdaysByPro = new Map<string, number[]>();
  for (const b of blocks) {
    const arr = weekdaysByPro.get(b.professionalId) ?? [];
    if (!arr.includes(b.weekday)) arr.push(b.weekday);
    weekdaysByPro.set(b.professionalId, arr);
  }

  const now = new Date();
  const items: CustomerAppointmentItem[] = appts.map((a) => {
    const isPast = a.startsAt < now;
    return {
      id: a.id,
      serviceId: a.serviceId,
      serviceName: a.service.name,
      serviceActive: a.service.active,
      durationMinutes: a.service.durationMinutes,
      priceCents: a.service.priceCents,
      professionalName: a.professional.name,
      startsAt: a.startsAt,
      whenLabel: formatWhen(a.startsAt, a.tenant.timezone),
      status: a.status,
      seriesId: a.seriesId,
      tenant: a.tenant,
      openWeekdays: weekdaysByPro.get(a.professionalId) ?? [],
      currentDateStr: isoDateInTz(a.startsAt, a.tenant.timezone),
      isPast,
      isActive: !isPast && (a.status === 'PENDING' || a.status === 'CONFIRMED'),
      payment: a.payments[0] ?? null,
    };
  });

  // "Próximo" = futuro E ativo. Cancelado/realizado cai no histórico ("Agendar de
  // novo"), mesmo que o horário ainda seja futuro - senão o card cancelado gruda no
  // topo como se fosse o próximo agendamento.
  const upcoming = items
    .filter((i) => i.isActive)
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const past = items.filter((i) => !i.isActive); // já vem desc (cancelado futuro no topo)

  return { upcoming, past };
}

export interface RebookSource {
  appointmentId: string;
  serviceId: string;
  serviceName: string;
  durationMinutes: number;
  priceCents: number;
  professionalName: string | null;
  tenantName: string;
  timezone: string;
  openWeekdays: number[];
}

/**
 * Dados-fonte pra "agendar de novo" a partir de um agendamento do cliente. Aplica o
 * gate de ownership (contact.customerAccountId). Retorna null se não for do cliente,
 * se o serviço foi desativado ou se o estabelecimento desligou o booking online.
 */
export async function getRebookSource(
  account: CustomerAccount,
  appointmentId: string,
): Promise<RebookSource | null> {
  const appt = await prisma.appointment.findFirst({
    where: { id: appointmentId, contact: { customerAccountId: account.id } },
    select: {
      id: true,
      serviceId: true,
      professionalId: true,
      service: { select: { name: true, durationMinutes: true, priceCents: true, active: true } },
      professional: { select: { name: true } },
      tenant: { select: { name: true, timezone: true, publicBookingEnabled: true } },
    },
  });
  if (!appt) return null;
  if (!appt.service.active || !appt.tenant.publicBookingEnabled) return null;

  const blocks = await prisma.scheduleBlock.findMany({
    where: { professionalId: appt.professionalId },
    select: { weekday: true },
  });
  const openWeekdays = [...new Set(blocks.map((b) => b.weekday))];

  return {
    appointmentId: appt.id,
    serviceId: appt.serviceId,
    serviceName: appt.service.name,
    durationMinutes: appt.service.durationMinutes,
    priceCents: appt.service.priceCents,
    professionalName: appt.professional.name,
    tenantName: appt.tenant.name,
    timezone: appt.tenant.timezone,
    openWeekdays,
  };
}

export interface CustomerProfile {
  name: string | null;
  email: string;
  phone: string | null;
  /** Número do cadastro ainda não confirmado por OTP (null se já confirmado). */
  pendingPhone: string | null;
  document: string | null;
  birthDate: Date | null;
}

/**
 * Dados de cadastro do cliente. name/email/phone vêm da conta; document/birthDate
 * (que vivem nos Contacts) são lidos do Contact mais recente que os tenha.
 */
export async function getCustomerProfile(account: CustomerAccount): Promise<CustomerProfile> {
  // Fallback só pra contas legadas que gravaram document/birthDate no Contact antes de a
  // conta passar a ser a fonte da verdade. Contas novas leem direto da conta.
  const needsFallback = account.document == null && account.birthDate == null;
  const contact = needsFallback
    ? await prisma.contact.findFirst({
        where: {
          customerAccountId: account.id,
          OR: [{ document: { not: null } }, { birthDate: { not: null } }],
        },
        orderBy: { updatedAt: 'desc' },
        select: { document: true, birthDate: true },
      })
    : null;

  return {
    name: account.name,
    email: account.email,
    phone: account.phone,
    pendingPhone: account.pendingPhone,
    document: decryptNullable(account.document ?? contact?.document),
    birthDate: account.birthDate ?? contact?.birthDate ?? null,
  };
}

// ---------------------------------------------------------------------------
// MUTAÇÕES da conta do cliente (cores puros). Compartilhados pelas server actions
// da área do cliente (apps/web) e pelos route handlers do app mobile
// (/api/mobile/v1/me*). Recebem o `account` já autenticado + args tipados, validam
// o domínio e retornam { ok } | { error } (sem FormData, sem revalidatePath).
// ---------------------------------------------------------------------------

export type CustomerMutationResult = { ok: true } | { error: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PHONE_RE = /^55\d{10,11}$/;

/** Normaliza pra E.164 do BR; null se não bater no formato. */
function normalizePhoneE164(raw: string): string | null {
  const v = normalizePhoneBR(raw ?? '');
  return PHONE_RE.test(v) ? v : null;
}

/**
 * Atualiza o cadastro: `name` vai na conta + propaga aos Contacts vinculados;
 * document/birthDate (opcionais) só sobrescrevem quando informados - não apagam o
 * que já existe. O document salvo pré-preenche o checkout (ver payments-actions.ts).
 */
export async function updateCustomerProfileCore(
  account: CustomerAccount,
  input: { name: string; document?: string; birthDate?: string },
): Promise<CustomerMutationResult> {
  const name = (input.name ?? '').trim();
  if (name.length < 2 || name.length > 80) return { error: 'Informe seu nome' };

  let documentDigits: string | undefined;
  const doc = input.document?.trim();
  if (doc) {
    if (!isValidCpfCnpj(doc)) return { error: 'CPF/CNPJ inválido' };
    documentDigits = onlyDigits(doc);
  }

  let birthDate: Date | undefined;
  const bd = input.birthDate?.trim();
  if (bd) {
    if (!DATE_RE.test(bd)) return { error: 'Data de nascimento inválida' };
    const d = new Date(`${bd}T00:00:00.000Z`);
    if (Number.isNaN(d.getTime())) return { error: 'Data de nascimento inválida' };
    birthDate = d;
  }

  const encryptedDoc = documentDigits ? encryptSecret(documentDigits) : undefined;
  // Fonte da verdade: a conta (sobrevive sem nenhum Contact). Só grava document/birthDate
  // quando vieram no input - salvar só o nome não pode apagar CPF/nascimento já guardados.
  await prisma.customerAccount.update({
    where: { id: account.id },
    data: {
      name,
      ...(encryptedDoc ? { document: encryptedDoc } : {}),
      ...(birthDate ? { birthDate } : {}),
    },
  });
  // Mantém os Contacts por-tenant em sincronia (registros do estabelecimento).
  await prisma.contact.updateMany({
    where: { customerAccountId: account.id },
    data: {
      name,
      ...(encryptedDoc ? { document: encryptedDoc } : {}),
      ...(birthDate ? { birthDate } : {}),
    },
  });
  return { ok: true };
}

/** Liga/desliga os e-mails de agendamento (confirmação/lembrete/remarcação/cancelamento). */
export async function setCustomerNotifications(
  account: CustomerAccount,
  appointmentEmailsEnabled: boolean,
): Promise<CustomerMutationResult> {
  await prisma.customerAccount.update({
    where: { id: account.id },
    data: { appointmentEmailsEnabled },
  });
  return { ok: true };
}

/**
 * Grava o WhatsApp como PENDENTE (sem OTP), igual ao cadastro por senha. Usado no
 * onboarding de quem entra com Google (que não informa telefone) - assim a conta fica
 * completa e o agendamento passa a pré-preencher em vez de pedir "Seus dados". NÃO
 * reivindica histórico: isso exige prova de posse via OTP (ver changeCustomerPhone).
 */
export async function setCustomerPendingPhone(
  account: CustomerAccount,
  phoneRaw: string,
): Promise<CustomerMutationResult> {
  const phone = normalizePhoneE164(phoneRaw);
  if (!phone) return { error: 'Celular inválido - confira o DDD' };
  await prisma.customerAccount.update({
    where: { id: account.id },
    data: { pendingPhone: phone },
  });
  return { ok: true };
}

/** Envia o OTP por SMS pro NOVO número antes de trocar (prova de posse, igual ao cadastro). */
export async function sendPhoneChangeCode(
  account: CustomerAccount,
  newPhoneRaw: string,
): Promise<CustomerMutationResult> {
  const newPhone = normalizePhoneE164(newPhoneRaw);
  if (!newPhone) return { error: 'Celular inválido - confira o DDD' };
  if (newPhone === account.phone) return { error: 'Este já é o seu número atual.' };
  const taken = await prisma.customerAccount.findFirst({
    where: { phone: newPhone, id: { not: account.id } },
    select: { id: true },
  });
  if (taken) return { error: 'Este número já está em uso por outra conta.' };
  const res = await sendPhoneOtp(newPhone);
  if (!res.ok) return { error: res.error };
  return { ok: true };
}

/**
 * Confirma o OTP e passa o número a ser o `phone` oficial (reivindicando os Contacts
 * de mesmo telefone). O número antigo NÃO é desvinculado - preserva o histórico.
 */
export async function changeCustomerPhone(
  account: CustomerAccount,
  phoneRaw: string,
  codeRaw: string,
): Promise<CustomerMutationResult> {
  const phone = normalizePhoneE164(phoneRaw);
  if (!phone) return { error: 'Celular inválido - confira o DDD' };
  const code = (codeRaw ?? '').replace(/\D/g, '');
  if (code.length < 4) return { error: 'Informe o código recebido por SMS' };
  if (phone === account.phone) return { error: 'Este já é o seu número atual.' };
  const taken = await prisma.customerAccount.findFirst({
    where: { phone, id: { not: account.id } },
    select: { id: true },
  });
  if (taken) return { error: 'Este número já está em uso por outra conta.' };

  const verified = await checkPhoneOtp(phone, code);
  if (!verified.ok) return { error: verified.error };

  await prisma.customerAccount.update({
    where: { id: account.id },
    data: { phone, pendingPhone: null },
  });
  await claimContactsByPhone(account.id, phone);
  return { ok: true };
}

/**
 * Exclui a conta do cliente (ação irreversível, exigida pelas app stores). A cascata
 * do schema derruba Favorite/PushDevice; os Contacts viram SetNull (o histórico do
 * agendamento fica com o tenant). Depois remove o usuário do Supabase Auth.
 */
export async function deleteCustomerAccount(
  account: CustomerAccount,
): Promise<CustomerMutationResult> {
  await prisma.customerAccount.delete({ where: { id: account.id } });
  await getSupabaseAdmin()
    .auth.admin.deleteUser(account.authId)
    .catch(() => {});
  return { ok: true };
}
