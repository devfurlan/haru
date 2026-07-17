// Helpers de profissionais para o agendamento (booking público + painel).
//
// Centraliza: (1) quais profissionais atendem um serviço, (2) carregar a
// disponibilidade de um dia por profissional e (3) resolver qual profissional
// atende um horário ("sem preferência" = primeiro livre, determinístico por nome).
//
// Reaproveita as funções puras de `availability.ts` - aqui só entram as queries.

import { prisma } from '@haru/database';

import {
  type AvailableSlotWithProfessionals,
  type ProfessionalAvailabilityInput,
  computeSlotsAcrossProfessionals,
  isoDateInTz,
  localWallTimeToUtc,
  weekdayInTz,
} from '@haru/shared';

export interface ProfessionalLite {
  id: string;
  name: string | null;
}

/**
 * Profissionais (User com agenda própria) que executam o serviço, ordenados por
 * nome. Não filtra por status de login: um profissional recém-convidado já pode
 * ser agendado assim que o dono define a grade dele. A disponibilidade exclui
 * sozinha quem não tem expediente.
 */
export async function getServiceProfessionals(
  tenantId: string,
  serviceId: string,
): Promise<ProfessionalLite[]> {
  return prisma.user.findMany({
    where: {
      tenantId,
      isProfessional: true,
      professionalServices: { some: { serviceId } },
    },
    select: { id: true, name: true },
    orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
  });
}

/**
 * Monta a disponibilidade do dia para cada profissional informado (na ordem dada).
 * Junta, por profissional: sua grade, seus agendamentos ativos do dia e as folgas
 * que o afetam (do tenant inteiro + as pessoais dele).
 */
export async function loadDayAvailability(args: {
  tenantId: string;
  professionalIds: string[];
  tz: string;
  dateStr: string;
  /** Exclui um agendamento da checagem de colisão (usado na remarcação). */
  excludeAppointmentId?: string;
}): Promise<ProfessionalAvailabilityInput[]> {
  const { tenantId, professionalIds, tz, dateStr, excludeAppointmentId } = args;
  if (professionalIds.length === 0) return [];

  const dayStart = localWallTimeToUtc(dateStr, 0, tz);
  const dayEnd = localWallTimeToUtc(dateStr, 24 * 60, tz);

  const [blocks, appointments, exceptions] = await Promise.all([
    prisma.scheduleBlock.findMany({
      where: { tenantId, professionalId: { in: professionalIds } },
      select: { professionalId: true, weekday: true, startMinute: true, endMinute: true },
    }),
    prisma.appointment.findMany({
      where: {
        tenantId,
        professionalId: { in: professionalIds },
        ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
        status: { in: ['PENDING', 'CONFIRMED'] },
        AND: [{ startsAt: { lt: dayEnd } }, { endsAt: { gt: dayStart } }],
      },
      select: { professionalId: true, startsAt: true, endsAt: true },
    }),
    prisma.scheduleException.findMany({
      where: {
        tenantId,
        // Folgas do tenant inteiro (professionalId null) + as pessoais dos candidatos.
        OR: [{ professionalId: null }, { professionalId: { in: professionalIds } }],
        AND: [{ startsAt: { lt: dayEnd } }, { endsAt: { gt: dayStart } }],
      },
      select: { professionalId: true, startsAt: true, endsAt: true },
    }),
  ]);

  const tenantWideExceptions = exceptions.filter((e) => e.professionalId === null);

  return professionalIds.map((id) => ({
    professionalId: id,
    blocks: blocks.filter((b) => b.professionalId === id),
    appointments: appointments.filter((a) => a.professionalId === id),
    exceptions: [...tenantWideExceptions, ...exceptions.filter((e) => e.professionalId === id)],
  }));
}

/**
 * Horários livres de um serviço num dia, considerando todos os profissionais que o
 * atendem (ou só `professionalId`, se informado). Cada slot traz quem está livre.
 */
export async function getServiceDaySlots(args: {
  tenantId: string;
  serviceId: string;
  tz: string;
  durationMinutes: number;
  dateStr: string;
  now: Date;
  /** Restringe a um profissional específico; ausente = qualquer um que atenda. */
  professionalId?: string | null;
  excludeAppointmentId?: string;
  /** Também retorna horários ocupados (available:false) pra UI riscar. Default false. */
  includeBusy?: boolean;
}): Promise<AvailableSlotWithProfessionals[]> {
  let candidates = await getServiceProfessionals(args.tenantId, args.serviceId);
  if (args.professionalId) {
    candidates = candidates.filter((c) => c.id === args.professionalId);
  }
  if (candidates.length === 0) return [];

  const professionals = await loadDayAvailability({
    tenantId: args.tenantId,
    professionalIds: candidates.map((c) => c.id),
    tz: args.tz,
    dateStr: args.dateStr,
    excludeAppointmentId: args.excludeAppointmentId,
  });

  return computeSlotsAcrossProfessionals({
    tz: args.tz,
    dateStr: args.dateStr,
    durationMinutes: args.durationMinutes,
    now: args.now,
    professionals,
    includeBusy: args.includeBusy,
  });
}

export interface OfferedSlot {
  /** YYYY-MM-DD no fuso do tenant (vira o `d=` do deep-link de agendamento). */
  dateStr: string;
  /** UTC ISO (== Appointment.startsAt). */
  startsAtIso: string;
  /** "HH:MM" no fuso do tenant. */
  label: string;
}

/**
 * Próximos horários livres de UM profissional pro serviço, varrendo até `horizonDays`
 * a partir de hoje (fuso do tenant) e parando em `limit`. Pula dias sem expediente do
 * profissional (evita 3 queries/dia à toa). Reusa getServiceDaySlots - é o "próximo slot
 * em N dias" que a busca de 1-dia não oferece. Usado pelo lembrete de retorno pra ofertar
 * horários concretos; retorna [] quando o profissional não tem vaga no horizonte (o
 * caller manda então a versão genérica).
 * ponytail: loop simples com early-break; se pesar no cron, virar 1 query da janela + núcleo puro.
 */
export async function nextSlotsForProfessional(args: {
  tenantId: string;
  serviceId: string;
  professionalId: string;
  tz: string;
  durationMinutes: number;
  now: Date;
  horizonDays: number;
  limit: number;
}): Promise<OfferedSlot[]> {
  const blocks = await prisma.scheduleBlock.findMany({
    where: { tenantId: args.tenantId, professionalId: args.professionalId },
    select: { weekday: true },
  });
  if (blocks.length === 0) return [];
  const openWeekdays = new Set(blocks.map((b) => b.weekday));

  const out: OfferedSlot[] = [];
  const startMs = args.now.getTime();
  for (let i = 0; i < args.horizonDays && out.length < args.limit; i++) {
    const dateStr = isoDateInTz(new Date(startMs + i * 86_400_000), args.tz);
    if (!openWeekdays.has(weekdayInTz(dateStr, args.tz))) continue; // dia fechado -> pula sem query
    const slots = await getServiceDaySlots({
      tenantId: args.tenantId,
      serviceId: args.serviceId,
      tz: args.tz,
      durationMinutes: args.durationMinutes,
      dateStr,
      now: args.now,
      professionalId: args.professionalId,
      includeBusy: false,
    });
    for (const s of slots) {
      out.push({ dateStr, startsAtIso: s.startsAtIso, label: s.label });
      if (out.length >= args.limit) break;
    }
  }
  return out;
}

export type ResolveProfessional =
  | { ok: true; professionalId: string }
  | { ok: false; reason: string };

/**
 * Decide qual profissional atende um horário já escolhido. Revalida tudo no
 * servidor (grade + grade alinhada + colisão + folga), por isso reusa o cálculo de
 * slots: o profissional só é aceito se o horário estiver de fato livre pra ele.
 * "Sem preferência" (sem `requestedProfessionalId`) escolhe o primeiro livre na
 * ordem por nome - determinístico.
 */
export async function resolveBookingProfessional(args: {
  tenantId: string;
  serviceId: string;
  tz: string;
  durationMinutes: number;
  startsAt: Date;
  dateStr: string;
  now: Date;
  requestedProfessionalId?: string | null;
  excludeAppointmentId?: string;
}): Promise<ResolveProfessional> {
  const slots = await getServiceDaySlots({
    tenantId: args.tenantId,
    serviceId: args.serviceId,
    tz: args.tz,
    durationMinutes: args.durationMinutes,
    dateStr: args.dateStr,
    now: args.now,
    professionalId: args.requestedProfessionalId ?? undefined,
    excludeAppointmentId: args.excludeAppointmentId,
  });

  const slot = slots.find((s) => s.startsAtIso === args.startsAt.toISOString());
  if (!slot || slot.professionalIds.length === 0) {
    return { ok: false, reason: 'Esse horário não está mais disponível. Escolha outro.' };
  }
  // professionalIds vem na ordem por nome; o primeiro livre é a escolha "sem
  // preferência". Se houver requestedProfessionalId, a lista já está filtrada a ele.
  return { ok: true, professionalId: slot.professionalIds[0] };
}
