import { prisma } from '@haru/database';
import type { Subscription } from '@haru/database';

import type { FeatureKey } from './types';

/** Subconjunto mínimo de Tenant que os helpers de uso precisam. */
export interface TenantWithSubscription {
  id: string;
  subscription?: Subscription | null;
}

/**
 * True quando a assinatura dá acesso. ACTIVE = em dia. CANCELED mas ainda dentro do
 * período já pago (currentPeriodEnd no futuro) também mantém acesso até essa data -
 * cancelamento vale "no fim do período" sem precisar de cron. Sem carência: PAST_DUE,
 * PENDING e SUSPENDED não dão acesso (quem não paga não usa).
 */
export function isSubscriptionActive(sub: Subscription | null | undefined): boolean {
  if (!sub) return false;
  if (sub.status === 'ACTIVE') return true;
  if (sub.status === 'CANCELED' && sub.currentPeriodEnd && sub.currentPeriodEnd.getTime() > Date.now()) {
    return true;
  }
  return false;
}

/** True se a assinatura ativa libera a feature (lê os flags do snapshot). */
export function hasFeature(sub: Subscription | null | undefined, feature: FeatureKey): boolean {
  if (!isSubscriptionActive(sub) || !sub) return false;
  switch (feature) {
    case 'onlinePayments':
      return sub.featOnlinePayments;
    case 'webhooks':
      return sub.featWebhooks;
    case 'team':
      return sub.featTeam;
  }
}

// --- Uso mensal --------------------------------------------------------------

/** Intervalo [início, fim) do mês corrente (UTC). Mês civil = janela de cota. */
function monthRange(now: Date): { gte: Date; lt: Date } {
  const gte = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const lt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { gte, lt };
}

/** Agendamentos criados no mês (exclui cancelados). Conta sob demanda via índice. */
export async function getMonthlyAppointmentUsage(tenantId: string, now = new Date()): Promise<number> {
  const { gte, lt } = monthRange(now);
  return prisma.appointment.count({
    where: { tenantId, createdAt: { gte, lt }, status: { not: 'CANCELED' } },
  });
}

/** Mensagens de IA no mês = nº de turnos do bot (uma linha em AiUsageLog por turno). */
export async function getMonthlyAiUsage(tenantId: string, now = new Date()): Promise<number> {
  const { gte, lt } = monthRange(now);
  return prisma.aiUsageLog.count({ where: { tenantId, createdAt: { gte, lt } } });
}

export interface UsageMetric {
  used: number;
  /** null = ilimitado (Enterprise / sem assinatura). */
  limit: number | null;
  /** Percentual de uso (0-∞) ou null se ilimitado. */
  pct: number | null;
}

export interface UsageStatus {
  appointments: UsageMetric;
  aiMessages: UsageMetric;
}

function metric(used: number, limit: number | null): UsageMetric {
  return { used, limit, pct: limit && limit > 0 ? Math.round((used / limit) * 100) : null };
}

/** Uso do mês + limites do snapshot da assinatura, pronto para o banner. */
export async function getUsageStatus(
  tenant: TenantWithSubscription,
  now = new Date(),
): Promise<UsageStatus> {
  const sub = tenant.subscription ?? null;
  const [appts, ai] = await Promise.all([
    getMonthlyAppointmentUsage(tenant.id, now),
    getMonthlyAiUsage(tenant.id, now),
  ]);
  return {
    appointments: metric(appts, sub?.appointmentsLimit ?? null),
    aiMessages: metric(ai, sub?.aiMessagesLimit ?? null),
  };
}

/**
 * Maior limiar de alerta atingido para um percentual de uso.
 * 0 = abaixo de 85%; 100 = limite excedido. Usado pelo banner do dashboard.
 */
export function alertLevel(pct: number | null): 0 | 85 | 90 | 95 | 100 {
  if (pct === null) return 0;
  if (pct >= 100) return 100;
  if (pct >= 95) return 95;
  if (pct >= 90) return 90;
  if (pct >= 85) return 85;
  return 0;
}
