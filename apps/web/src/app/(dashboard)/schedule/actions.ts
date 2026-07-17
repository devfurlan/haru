'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { prisma } from '@haru/database';

import { requireAdmin } from '@/lib/auth';

const blockSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  startMinute: z
    .number()
    .int()
    .min(0)
    .max(24 * 60),
  endMinute: z
    .number()
    .int()
    .min(0)
    .max(24 * 60),
});

const blocksSchema = z.array(blockSchema).max(7 * 6, 'Excesso de blocos');

export type SaveScheduleResult = { error: string } | { ok: true };

export async function saveSchedule(
  professionalId: string,
  blocks: Array<{ weekday: number; startMinute: number; endMinute: number }>,
): Promise<SaveScheduleResult> {
  const { tenant } = await requireAdmin();

  // O alvo precisa ser um profissional (com agenda) deste tenant.
  const professional = await prisma.user.findFirst({
    where: { id: professionalId, tenantId: tenant.id, isProfessional: true },
    select: { id: true },
  });
  if (!professional) {
    return { error: 'Profissional não encontrado.' };
  }

  const parsed = blocksSchema.safeParse(blocks);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  // Valida ranges: start < end e sem sobreposição dentro do mesmo weekday
  for (const block of parsed.data) {
    if (block.startMinute >= block.endMinute) {
      return { error: 'Horário inicial deve ser anterior ao final' };
    }
  }
  const byWeekday = new Map<number, typeof parsed.data>();
  for (const block of parsed.data) {
    const list = byWeekday.get(block.weekday) ?? [];
    list.push(block);
    byWeekday.set(block.weekday, list);
  }
  for (const list of byWeekday.values()) {
    list.sort((a, b) => a.startMinute - b.startMinute);
    for (let i = 1; i < list.length; i++) {
      if (list[i].startMinute < list[i - 1].endMinute) {
        return { error: 'Os intervalos do mesmo dia não podem se sobrepor' };
      }
    }
  }

  await prisma.$transaction([
    prisma.scheduleBlock.deleteMany({ where: { tenantId: tenant.id, professionalId } }),
    prisma.scheduleBlock.createMany({
      data: parsed.data.map((b) => ({
        tenantId: tenant.id,
        professionalId,
        weekday: b.weekday,
        startMinute: b.startMinute,
        endMinute: b.endMinute,
      })),
    }),
  ]);

  revalidatePath('/schedule');
  return { ok: true };
}
