'use server';

// Config do LEMBRETE DE RETORNO (dono, em /settings): liga/desliga pro estabelecimento.
// Horário é fixo (diário, fuso do tenant). O ciclo padrão por serviço é configurado na
// tela de Serviços (Service.returnCycleDays), não aqui.

import { revalidatePath } from 'next/cache';

import { prisma } from '@haru/database';

import { requireAdmin } from '@/lib/auth';

export type ReturnReminderSettingsResult = { ok: true } | { error: string };

export async function updateReturnReminderSettings(input: {
  enabled: boolean;
}): Promise<ReturnReminderSettingsResult> {
  const { tenant } = await requireAdmin();
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { returnRemindersEnabled: input.enabled },
  });
  revalidatePath('/settings');
  return { ok: true };
}
