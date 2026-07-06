import 'server-only';

import { prisma } from '@haru/database';
import type { NotificationChannel } from '@haru/database';

import type { NotifCopy } from './copy';

/**
 * Centro de notificações in-app (sino do painel). CRUD fino sobre o model Notification.
 * Escritores: webhook de billing (cobrança pendente), cron de renovação, e o loop de uso
 * do bot (que escreve direto via prisma, com sua própria copy). Leitura por tenant.
 */

/** Cria uma notificação in-app pro tenant. */
export async function createNotification(
  tenantId: string,
  channel: NotificationChannel,
  kind: string,
  copy: NotifCopy,
): Promise<void> {
  await prisma.notification.create({
    data: {
      tenantId,
      channel,
      kind,
      title: copy.title,
      body: copy.body,
      ctaLabel: copy.ctaLabel ?? null,
      ctaHref: copy.ctaHref ?? null,
    },
  });
}

/**
 * Novidade de produto (canal separado PRODUCT): 1 linha por tenant (broadcast). Chamável
 * de um script/admin quando houver update pra anunciar. Retorna quantos tenants receberam.
 * ponytail: fan-out por tenant; ok no volume atual (dezenas). Vira tabela broadcast +
 * marcador de leitura por usuário se o nº de tenants crescer muito.
 */
export async function createProductAnnouncement(copy: NotifCopy): Promise<number> {
  const tenants = await prisma.tenant.findMany({ select: { id: true } });
  await prisma.notification.createMany({
    data: tenants.map((t) => ({
      tenantId: t.id,
      channel: 'PRODUCT' as NotificationChannel,
      kind: 'product.news',
      title: copy.title,
      body: copy.body,
      ctaLabel: copy.ctaLabel ?? null,
      ctaHref: copy.ctaHref ?? null,
    })),
  });
  return tenants.length;
}

/** Quantas notificações não lidas o tenant tem (badge do sino). */
export async function unreadNotificationCount(tenantId: string): Promise<number> {
  return prisma.notification.count({ where: { tenantId, readAt: null } });
}

/** Notificações recentes do tenant (mais novas primeiro) pra lista do sino. */
export async function listNotifications(tenantId: string, limit = 20) {
  return prisma.notification.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/** Marca todas as não-lidas do tenant como lidas (ao abrir o sino). */
export async function markNotificationsRead(tenantId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { tenantId, readAt: null },
    data: { readAt: new Date() },
  });
}
