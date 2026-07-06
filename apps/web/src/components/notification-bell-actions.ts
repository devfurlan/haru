'use server';

import { requireUserAndTenant } from '@/lib/auth';
import { markNotificationsRead } from '@/lib/comms/notifications';

/** Marca todas as notificações do tenant como lidas (chamado ao abrir o sino). */
export async function markAllNotificationsRead(): Promise<void> {
  const { tenant } = await requireUserAndTenant();
  await markNotificationsRead(tenant.id);
}
