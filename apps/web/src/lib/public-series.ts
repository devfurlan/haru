// Prévia (server-side) de uma série recorrente pro booking público. Gera as datas
// mantendo o mesmo dia-da-semana/horário do 1º agendamento e classifica cada uma
// (livre/ocupado/fechado/passado/além do horizonte) reusando o MESMO motor de
// disponibilidade do resto do app (getServiceDaySlots). Também devolve os horários
// livres de cada dia, pro cliente "trocar" uma ocorrência em conflito sem outra ida
// ao servidor. Nada é criado aqui - só leitura; a criação re-valida tudo.
//
// Compartilhado pela server action (web) e pela rota mobile - ambas em apps/web.

import {
  type AvailableSlotWithProfessionals,
  isoDateInTz,
  type RecurrenceFrequency,
  type SeriesOccurrencePreview,
} from '@haru/shared';

import { loadPublicTenant } from '@/app/[slug]/_tenant';
import { getServiceDaySlots, resolveBookingProfessional } from '@/lib/professionals';
import { generateSeriesDates, RECURRENCE_MAX_HORIZON_DAYS } from '@/lib/recurrence';

const MS_PER_DAY = 86_400_000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type PreviewSeriesResult =
  | { error: string }
  | { ok: true; professionalId: string; occurrences: SeriesOccurrencePreview[] };

/**
 * Classifica as ocorrências de uma série a partir do primeiro slot. O profissional é
 * resolvido do 1º slot (fixo pra série inteira) e cada ocorrência é validada contra a
 * grade DELE - iguais ao caminho de criação (createAppointmentSeries), então a prévia
 * e o resultado batem.
 */
export async function previewPublicSeries(input: {
  slug: string;
  serviceId: string;
  professionalId?: string;
  firstStartsAtIso: string;
  frequency: RecurrenceFrequency;
  occurrences: number;
}): Promise<PreviewSeriesResult> {
  const tenant = await loadPublicTenant(input.slug);
  if (!tenant || !tenant.publicBookingEnabled) {
    return { error: 'Agendamento online indisponível no momento' };
  }
  const service = tenant.services.find((s) => s.id === input.serviceId && s.active);
  if (!service) return { error: 'Serviço não encontrado' };

  const first = new Date(input.firstStartsAtIso);
  const now = new Date();
  if (Number.isNaN(first.getTime()) || first <= now) {
    return { error: 'Esse horário já passou' };
  }

  // Resolve o profissional do 1º slot (mesma pessoa em toda a série).
  const resolved = await resolveBookingProfessional({
    tenantId: tenant.id,
    serviceId: service.id,
    tz: tenant.timezone,
    durationMinutes: service.durationMinutes,
    startsAt: first,
    dateStr: isoDateInTz(first, tenant.timezone),
    now,
    requestedProfessionalId: input.professionalId,
  });
  if (!resolved.ok) return { error: resolved.reason };
  const professionalId = resolved.professionalId;

  const count = Math.min(Math.max(Math.trunc(input.occurrences), 2), 12);
  const isos = generateSeriesDates(input.firstStartsAtIso, tenant.timezone, input.frequency, count);
  const maxInstant = new Date(now.getTime() + RECURRENCE_MAX_HORIZON_DAYS * MS_PER_DAY);

  const occurrences: SeriesOccurrencePreview[] = [];
  for (let i = 0; i < isos.length; i++) {
    const iso = isos[i];
    const start = new Date(iso);

    // 1ª ocorrência é a âncora já validada (o slot que o cliente escolheu) - fixa.
    if (i === 0) {
      occurrences.push({ targetIso: iso, status: 'free', slots: [] });
      continue;
    }
    if (start > maxInstant) {
      occurrences.push({ targetIso: iso, status: 'beyond', slots: [] });
      continue;
    }
    if (start <= now) {
      occurrences.push({ targetIso: iso, status: 'past', slots: [] });
      continue;
    }

    const daySlots = await getServiceDaySlots({
      tenantId: tenant.id,
      serviceId: service.id,
      tz: tenant.timezone,
      durationMinutes: service.durationMinutes,
      dateStr: isoDateInTz(start, tenant.timezone),
      now,
      professionalId,
      includeBusy: true,
    });
    const target = daySlots.find((s) => s.startsAtIso === iso);
    const status: SeriesOccurrencePreview['status'] = !target
      ? 'closed' // fora do expediente do profissional nesse dia
      : target.available === false
        ? 'taken' // dentro do expediente, mas ocupado
        : 'free';
    occurrences.push({
      targetIso: iso,
      status,
      // Horários livres do dia, pro "trocar" (a âncora não precisa).
      slots: daySlots
        .filter((s) => s.available !== false)
        .map((s) => ({ startsAtIso: s.startsAtIso, label: s.label })),
    });
  }

  return { ok: true, professionalId, occurrences };
}

/**
 * Horários de UM dia pra a troca de dia de uma ocorrência da série. Diferente da busca de
 * slots do agendamento avulso (getPublicSlots/getAvailableSlots, que corta em
 * BOOKING_HORIZON_DAYS), aqui a janela é o horizonte de recorrência (90 dias) e o
 * profissional é FIXO (o resolvido da série). Traz também os ocupados (riscados na UI).
 */
export async function previewSeriesDaySlots(input: {
  slug: string;
  serviceId: string;
  professionalId: string;
  dateStr: string;
}): Promise<AvailableSlotWithProfessionals[]> {
  if (!DATE_RE.test(input.dateStr)) return [];
  const tenant = await loadPublicTenant(input.slug);
  if (!tenant || !tenant.publicBookingEnabled) return [];
  const service = tenant.services.find((s) => s.id === input.serviceId && s.active);
  if (!service) return [];

  const now = new Date();
  const today = isoDateInTz(now, tenant.timezone);
  const maxDate = isoDateInTz(
    new Date(now.getTime() + (RECURRENCE_MAX_HORIZON_DAYS - 1) * MS_PER_DAY),
    tenant.timezone,
  );
  if (input.dateStr < today || input.dateStr > maxDate) return [];

  return getServiceDaySlots({
    tenantId: tenant.id,
    serviceId: service.id,
    tz: tenant.timezone,
    durationMinutes: service.durationMinutes,
    dateStr: input.dateStr,
    now,
    professionalId: input.professionalId || undefined,
    includeBusy: true,
  });
}
