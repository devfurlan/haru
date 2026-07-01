// Operações de agendamento da ÁREA DO CLIENTE, agnósticas de transporte: recebem o
// CustomerAccount já resolvido (por cookie na web, por Bearer JWT no app mobile) e
// aplicam o MESMO gate de ownership + os cores de mutação. Não fazem revalidatePath /
// Response - cada caller (server action ou route handler) cuida disso. É o análogo,
// no nível do cliente, do appointment-mutations.ts (nível do dono/tenant).

import { prisma, type AppointmentStatus, type CustomerAccount } from '@haru/database';

import { BOOKING_HORIZON_DAYS, isoDateInTz, type AvailableSlot } from '@haru/shared';

import {
  cancelAppointmentCore,
  createBookingCore,
  rescheduleAppointmentCore,
} from '@/lib/appointment-mutations';
import { getServiceDaySlots, resolveBookingProfessional } from '@/lib/professionals';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Carrega um agendamento garantindo que pertence ao cliente (via o Contact vinculado).
 * Filtra no `where` - nunca confia em id vindo do client. null = não é do cliente /
 * não existe. Fonte única do gate de ownership pra web e mobile.
 */
export async function getOwnedAppointment(customerAccountId: string, appointmentId: string) {
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

export type CustomerOpResult = { ok: true } | { error: string };

/** Remarca um agendamento do cliente (gate + core). O cliente remarcou ele mesmo:
 * avisa o dono por e-mail, não o próprio cliente. */
export async function rescheduleOwnedAppointment(
  account: CustomerAccount,
  appointmentId: string,
  newStartsAt: Date,
): Promise<CustomerOpResult> {
  const appt = await getOwnedAppointment(account.id, appointmentId);
  if (!appt) return { error: 'Agendamento não encontrado' };
  return rescheduleAppointmentCore({
    appointmentId: appt.id,
    tenantId: appt.tenantId,
    newStartsAt,
    notifyCustomer: false,
    notifyOwner: true,
  });
}

/** Cancela um agendamento do cliente (gate + core). Não dispara template pro próprio
 * cliente (ele acabou de cancelar); avisa o dono. */
export async function cancelOwnedAppointment(
  account: CustomerAccount,
  appointmentId: string,
): Promise<CustomerOpResult> {
  const appt = await getOwnedAppointment(account.id, appointmentId);
  if (!appt) return { error: 'Agendamento não encontrado' };
  const changed = await cancelAppointmentCore({
    appointmentId: appt.id,
    tenantId: appt.tenantId,
    notifyClient: false,
    notifyOwner: true,
  });
  if (!changed) return { error: 'Não foi possível cancelar este agendamento' };
  return { ok: true };
}

/** Slots livres pra REMARCAR: mesmo profissional, excluindo o próprio agendamento da
 * colisão. */
export async function loadRescheduleSlots(
  account: CustomerAccount,
  appointmentId: string,
  serviceId: string,
  dateStr: string,
): Promise<AvailableSlot[]> {
  if (!DATE_RE.test(dateStr)) return [];
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

export type RebookResult = { ok: true; status: AppointmentStatus } | { error: string };

/** Agendar de novo (1 clique): repete serviço/profissional de um agendamento. Revalida
 * o slot no servidor; prioriza o profissional original e cai pra "sem preferência" se
 * ele não estiver livre. */
export async function rebookOwned(
  account: CustomerAccount,
  sourceAppointmentId: string,
  startsAt: Date,
): Promise<RebookResult> {
  const source = await getOwnedAppointment(account.id, sourceAppointmentId);
  if (!source) return { error: 'Agendamento não encontrado' };
  if (!source.tenant.publicBookingEnabled) {
    return { error: 'Este estabelecimento não está aceitando agendamentos online.' };
  }
  if (!source.service.active) {
    return { error: 'Este serviço não está mais disponível.' };
  }

  const dateStr = isoDateInTz(startsAt, source.tenant.timezone);
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
  if (!resolved.ok) return { error: resolved.reason };

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
  if ('error' in result) return { error: result.error };
  return { ok: true, status };
}

/** Slots livres pra AGENDAR DE NOVO (agendamento novo, sem exclusão). Respeita a janela
 * permitida (nem passado, nem além do horizonte). */
export async function loadRebookSlots(
  account: CustomerAccount,
  sourceAppointmentId: string,
  serviceId: string,
  dateStr: string,
): Promise<AvailableSlot[]> {
  if (!DATE_RE.test(dateStr)) return [];
  const source = await getOwnedAppointment(account.id, sourceAppointmentId);
  if (!source || source.serviceId !== serviceId) return [];

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
