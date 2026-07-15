'use server';

// Config do RELATÓRIO SEMANAL (dono, em /settings): liga/desliga e escolha do canal.
// Dia e horário são fixos (segunda de manhã, fuso do tenant) - não configurável de
// propósito, pra simplificar. Só grava os campos de config no Tenant.

import { revalidatePath } from 'next/cache';

import { prisma, type WeeklyReportChannel } from '@haru/database';

import { requireAdmin } from '@/lib/auth';

export type WeeklyReportSettingsResult = { ok: true } | { error: string };

const CHANNELS: readonly WeeklyReportChannel[] = ['EMAIL', 'WHATSAPP', 'BOTH'];

export async function updateWeeklyReportSettings(input: {
  enabled?: boolean;
  channel?: WeeklyReportChannel;
}): Promise<WeeklyReportSettingsResult> {
  const { tenant } = await requireAdmin();

  const data: { weeklyReportEnabled?: boolean; weeklyReportChannel?: WeeklyReportChannel } = {};

  if (typeof input.enabled === 'boolean') data.weeklyReportEnabled = input.enabled;
  if (input.channel !== undefined) {
    // O valor vem do cliente: só aceita o que existe no enum.
    if (!CHANNELS.includes(input.channel)) return { error: 'Canal inválido.' };
    data.weeklyReportChannel = input.channel;
  }
  if (Object.keys(data).length === 0) return { ok: true };

  await prisma.tenant.update({ where: { id: tenant.id }, data });
  revalidatePath('/settings');
  return { ok: true };
}
