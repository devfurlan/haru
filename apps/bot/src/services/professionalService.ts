// Profissionais no fluxo do bot.
//
// Centraliza: quem são os profissionais (User com agenda) de um tenant, quem
// atende cada serviço e a resolução de "quem atende este horário" (escolhido ou
// "sem preferência" = primeiro livre, determinístico por nome). Reaproveita
// occursWithinOpenBlocks de recurrence.ts para a checagem de expediente.

import prisma from '../lib/prisma.js';
import { occursWithinOpenBlocks } from '../lib/recurrence.js';

export interface BotProfessional {
  id: string;
  name: string | null;
}

/** Profissionais (com agenda) do tenant, ordenados por nome. */
export async function listActiveProfessionals(tenantId: string): Promise<BotProfessional[]> {
  return prisma.user.findMany({
    where: { tenantId, isProfessional: true },
    select: { id: true, name: true },
    orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
  });
}

/** Profissionais que executam um serviço, ordenados por nome. */
export async function professionalsForService(
  tenantId: string,
  serviceId: string,
): Promise<BotProfessional[]> {
  return prisma.user.findMany({
    where: { tenantId, isProfessional: true, professionalServices: { some: { serviceId } } },
    select: { id: true, name: true },
    orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
  });
}

export type ResolveProfessional =
  | { ok: true; professionalId: string; professionalName: string | null }
  | { ok: false; reason: string };

/**
 * Decide qual profissional atende um horário. Valida, por profissional: que atende
 * o serviço, que o horário cabe no expediente dele, que não há conflito de
 * agendamento e que não cai numa folga (do tenant ou pessoal). "Sem preferência"
 * (requestedProfessionalId vazio) escolhe o primeiro livre na ordem por nome.
 */
export async function resolveProfessionalForBooking(args: {
  tenantId: string;
  serviceId: string;
  startsAt: Date;
  endsAt: Date;
  tz: string;
  durationMinutes: number;
  requestedProfessionalId?: string;
}): Promise<ResolveProfessional> {
  let candidates = await professionalsForService(args.tenantId, args.serviceId);
  if (candidates.length === 0) {
    return { ok: false, reason: 'nenhum profissional atende este serviço' };
  }
  if (args.requestedProfessionalId) {
    const found = candidates.find((c) => c.id === args.requestedProfessionalId);
    if (!found) {
      return { ok: false, reason: 'o profissional escolhido não atende este serviço' };
    }
    candidates = [found];
  }

  const ids = candidates.map((c) => c.id);
  const [blocks, appts, exceptions] = await Promise.all([
    prisma.scheduleBlock.findMany({
      where: { tenantId: args.tenantId, professionalId: { in: ids } },
      select: { professionalId: true, weekday: true, startMinute: true, endMinute: true },
    }),
    prisma.appointment.findMany({
      where: {
        tenantId: args.tenantId,
        professionalId: { in: ids },
        status: { in: ['PENDING', 'CONFIRMED'] },
        AND: [{ startsAt: { lt: args.endsAt } }, { endsAt: { gt: args.startsAt } }],
      },
      select: { professionalId: true },
    }),
    prisma.scheduleException.findMany({
      where: {
        tenantId: args.tenantId,
        OR: [{ professionalId: null }, { professionalId: { in: ids } }],
        AND: [{ startsAt: { lt: args.endsAt } }, { endsAt: { gt: args.startsAt } }],
      },
      select: { professionalId: true },
    }),
  ]);

  for (const c of candidates) {
    const cBlocks = blocks.filter((b) => b.professionalId === c.id);
    if (
      !occursWithinOpenBlocks(args.startsAt.toISOString(), args.durationMinutes, args.tz, cBlocks)
    ) {
      continue;
    }
    if (appts.some((a) => a.professionalId === c.id)) continue;
    // Folga do tenant (professionalId null) ou pessoal do candidato bloqueia.
    if (exceptions.some((e) => e.professionalId === null || e.professionalId === c.id)) continue;
    return { ok: true, professionalId: c.id, professionalName: c.name };
  }
  return { ok: false, reason: 'nenhum profissional disponível nesse horário' };
}
