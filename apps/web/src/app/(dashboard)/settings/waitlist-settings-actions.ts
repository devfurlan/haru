'use server';

// Config da FILA DE ESPERA (dono, em /settings): liga/desliga, janela de confirmação e
// modo de notificação (ondas x todos de uma vez). Só grava os campos de config no Tenant.

import { revalidatePath } from 'next/cache';

import { prisma } from '@haru/database';

import { requireAdmin } from '@/lib/auth';
import { WINDOW_MAX_MINUTES, WINDOW_MIN_MINUTES } from '@/lib/waitlist-core';

export type WaitlistSettingsResult = { ok: true } | { error: string };

export async function updateWaitlistSettings(input: {
  enabled?: boolean;
  windowMinutes?: number;
  notifyAllAtOnce?: boolean;
}): Promise<WaitlistSettingsResult> {
  const { tenant } = await requireAdmin();

  const data: {
    waitlistEnabled?: boolean;
    waitlistWindowMinutes?: number;
    waitlistNotifyAllAtOnce?: boolean;
  } = {};

  if (typeof input.enabled === 'boolean') data.waitlistEnabled = input.enabled;
  if (typeof input.notifyAllAtOnce === 'boolean')
    data.waitlistNotifyAllAtOnce = input.notifyAllAtOnce;
  if (typeof input.windowMinutes === 'number') {
    if (!Number.isFinite(input.windowMinutes)) return { error: 'Janela inválida.' };
    data.waitlistWindowMinutes = Math.min(
      WINDOW_MAX_MINUTES,
      Math.max(WINDOW_MIN_MINUTES, Math.round(input.windowMinutes)),
    );
  }
  if (Object.keys(data).length === 0) return { ok: true };

  await prisma.tenant.update({ where: { id: tenant.id }, data });
  revalidatePath('/settings');
  revalidatePath('/appointments');
  return { ok: true };
}
