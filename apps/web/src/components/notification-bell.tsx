import { listNotifications, unreadNotificationCount } from '@/lib/comms/notifications';

import { NotificationBellClient, type NotifItem } from './notification-bell-client';

/**
 * Sino de notificações do painel (server component). Busca as notificações do tenant +
 * a contagem de não-lidas e serializa as datas pra passar ao client. Fica no topo da
 * sidebar do dashboard.
 */
export async function NotificationBell({ tenantId }: { tenantId: string }) {
  const [items, unread] = await Promise.all([
    listNotifications(tenantId, 20),
    unreadNotificationCount(tenantId),
  ]);

  const notifications: NotifItem[] = items.map((n) => ({
    id: n.id,
    channel: n.channel,
    title: n.title,
    body: n.body,
    ctaLabel: n.ctaLabel,
    ctaHref: n.ctaHref,
    readAt: n.readAt ? n.readAt.toISOString() : null,
    createdAt: n.createdAt.toISOString(),
  }));

  return <NotificationBellClient notifications={notifications} unread={unread} />;
}
