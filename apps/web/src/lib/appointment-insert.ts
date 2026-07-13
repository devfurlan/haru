// Inserção de Appointment com guarda de corrida. Extraído de createBookingCore pra
// ISOLAR a seção crítica - o único ponto onde dois criadores concorrentes (duas
// confirmações da mesma onda da fila, ou fila vs. fluxo normal) podiam gerar
// double-booking no mesmo (profissional, horário). Importa só @haru/database, então é
// testável sem arrastar o grafo server-only/next.
//
// Contexto: a constraint EXCLUDE de banco que fechava essa corrida foi removida
// (migration 20260711130000_drop_appointment_no_overlap) porque proibia o Encaixe
// (overbook proposital do dono). Sobrou só o findFirst+create do app, que NÃO é atômico.

import { type AppointmentStatus, prisma } from '@haru/database';

import { consumeCreditInTx } from './memberships/credit-core';

export type GuardedInsert =
  | { appointmentId: string; coveredBySubscription: boolean }
  | { conflict: true };

export async function insertAppointmentGuarded(input: {
  tenantId: string;
  contactId: string;
  serviceId: string;
  professionalId: string;
  startsAt: Date;
  endsAt: Date;
  status: AppointmentStatus;
  fromWaitlist: boolean;
  /**
   * Crédito de assinatura a descontar NA MESMA TX do create (resolvido antes por
   * resolveCoveredMembership). Ausente = agendamento avulso. Descontar dentro da tx garante
   * "coberto ⟺ crédito debitado" atômico; se o saldo acabou numa corrida, cai pra avulso.
   */
  credit?: { membershipId: string; creditCost: number };
}): Promise<GuardedInsert> {
  const {
    tenantId,
    contactId,
    serviceId,
    professionalId,
    startsAt,
    endsAt,
    status,
    fromWaitlist,
    credit,
  } = input;

  return prisma.$transaction(async (tx) => {
    // Guarda de corrida: serializa criadores concorrentes do MESMO (profissional, horário).
    // Advisory lock transacional (liberado no commit): o 2º concorrente só passa daqui depois
    // do 1º commitar, então o findFirst abaixo já enxerga o agendamento dele e recua. Fecha
    // fila-vs-fila e fila-vs-fluxo-normal sem constraint global (que quebraria o Encaixe).
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${professionalId} || '|' || ${startsAt.toISOString()}, 0))`;

    // Re-checa conflito (por profissional, faixa [startsAt, endsAt) meio-aberta) e cria.
    const conflict = await tx.appointment.findFirst({
      where: {
        tenantId,
        professionalId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        AND: [{ startsAt: { lt: endsAt } }, { endsAt: { gt: startsAt } }],
      },
      select: { id: true },
    });
    if (conflict) return { conflict: true };

    const appt = await tx.appointment.create({
      data: { tenantId, contactId, serviceId, professionalId, startsAt, endsAt, status, fromWaitlist },
      select: { id: true },
    });

    // Desconta o crédito NA MESMA TX (guarda de concorrência própria: UPDATE condicional).
    const coveredBySubscription = credit
      ? await consumeCreditInTx(tx, {
          membershipId: credit.membershipId,
          creditCost: credit.creditCost,
          appointmentId: appt.id,
        })
      : false;

    return { appointmentId: appt.id, coveredBySubscription };
  });
}
