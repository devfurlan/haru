'use server';

// Ação do painel: "Encaixar" alguém da fila manualmente (abrir horário extra e chamar
// direto). Cria um agendamento fora da grade (encaixe/over-book, igual ao encaixe manual
// da agenda) e tira o cliente da fila. NÃO conta como recuperação automática (o dono agiu),
// por isso fromWaitlist fica false. Escrita na fila é pontual e não colide com a engine.

import { revalidatePath } from 'next/cache';

import { prisma } from '@haru/database';
import { hhmmToMinutes, localWallTimeToUtc } from '@haru/shared';

import { requireUserAndTenant } from '@/lib/auth';
import { dateStrOf } from '@/lib/waitlist-core';

export type EncaixeResult = { ok: true } | { error: string };

export async function encaixeFromWaitlist(input: {
  entryId: string;
  time: string; // "HH:MM" no fuso do tenant
}): Promise<EncaixeResult> {
  const { tenant } = await requireUserAndTenant();

  const minutes = hhmmToMinutes(input.time);
  if (minutes === null) return { error: 'Horário inválido.' };

  const entry = await prisma.waitlistEntry.findFirst({
    where: { id: input.entryId, tenantId: tenant.id, status: 'WAITING' },
    include: { service: { select: { durationMinutes: true } } },
  });
  if (!entry) return { error: 'Essa pessoa não está mais na fila.' };

  const dateStr = dateStrOf(entry.date);
  const startsAt = localWallTimeToUtc(dateStr, minutes, tenant.timezone);
  const endsAt = new Date(startsAt.getTime() + entry.service.durationMinutes * 60_000);

  // Encaixe: cria direto (libera 24h + sobreposição, como o encaixe manual da agenda) e
  // marca a inscrição como atendida na mesma transação.
  await prisma.$transaction([
    prisma.appointment.create({
      data: {
        tenantId: tenant.id,
        contactId: entry.contactId,
        serviceId: entry.serviceId,
        professionalId: entry.professionalId,
        startsAt,
        endsAt,
        status: 'CONFIRMED',
      },
    }),
    prisma.waitlistEntry.update({ where: { id: entry.id }, data: { status: 'FULFILLED' } }),
  ]);

  revalidatePath('/appointments');
  return { ok: true };
}
