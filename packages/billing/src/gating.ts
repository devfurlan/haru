import { prisma } from '@haru/database';
import type { Subscription } from '@haru/database';

import type { FeatureKey } from './types';

// REGRA DURA: estes helpers são de gating OWNER-side (ações do dono no painel:
// criar serviço, adicionar profissional, ligar pagamentos, etc.). NUNCA use no
// caminho do cliente final - estourar o teto trava o dono, jamais derruba um
// agendamento que o cliente está fazendo/já fez. Ver getUsageStatus/isOverLimit.

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
  if (
    sub.status === 'CANCELED' &&
    sub.currentPeriodEnd &&
    sub.currentPeriodEnd.getTime() > Date.now()
  ) {
    return true;
  }
  return false;
}

/**
 * True se o addon "Atendente IA no WhatsApp" está ATIVO de fato: assinatura base dá
 * acesso, há um addon contratado (`addonTier`) e ele já foi ativado (`addonActivatedAt`).
 * O `addonTier` é setado já na ESCOLHA (antes de pagar o setup / o operador concluir a
 * WABA), então exigir `addonActivatedAt` é o que separa "escolhido/aguardando" de "no ar"
 * - sem isso o bot seria liberado antes da hora. Independente do tier do plano base (Solo
 * base + Bot Time é válido). Desativação vale "no fim do ciclo": mesmo com `addonCanceledAt`
 * setado, segue ativo enquanto `currentPeriodEnd` (período já pago) estiver no futuro - o
 * webhook de renovação zera o snapshot do addon quando o ciclo vira.
 */
export function isAddonActive(sub: Subscription | null | undefined): boolean {
  if (!isSubscriptionActive(sub) || !sub || sub.addonTier == null || sub.addonActivatedAt == null) {
    return false;
  }
  if (sub.addonCanceledAt == null) return true;
  return sub.currentPeriodEnd != null && sub.currentPeriodEnd.getTime() > Date.now();
}

/**
 * True se o tenant PODE conectar uma WABA própria (número dele) na Cloud API: variante
 * "número próprio" (OWN) do addon Atendente IA COM o setup já pago. A config técnica da
 * WABA só libera depois do pagamento do setup (ver a tela assinatura/atendente-ia). NÃO
 * exige `addonActivatedAt`: a conexão acontece ANTES da ativação (a equipe verifica e ativa
 * depois), então gatear por `isAddonActive` travaria a própria conexão legítima do addon.
 * Trust boundary: fecha a conexão de WABA fora do fluxo pago - plano base NÃO conecta número.
 * (A variante DEMANDAE usa o número compartilhado da plataforma; não passa por aqui.)
 */
export function canConnectOwnWhatsapp(sub: Subscription | null | undefined): boolean {
  return (
    isSubscriptionActive(sub) && sub!.addonChannel === 'OWN' && sub!.addonSetupChargedAt != null
  );
}

/**
 * Valor recorrente unificado (centavos) que a assinatura Asaas deve carregar: plano base
 * + addon quando ATIVO. Lê do snapshot (grandfather), não do catálogo. Centraliza a soma
 * pra que trocar de plano (changePlan) não perca o addon da conta e desativar o addon
 * (deactivateAddon) volte o `value` só pro plano base.
 */
export function recurringValueCents(sub: Subscription | null | undefined): number {
  if (!sub) return 0;
  return sub.priceCents + (isAddonActive(sub) ? (sub.addonPriceCents ?? 0) : 0);
}

/**
 * Proporcional (centavos) de um valor de ciclo para os dias restantes do ciclo atual -
 * usado quando o addon entra no meio do ciclo do plano base (o 1º período é cobrado
 * pro-rata sobre a janela currentPeriodStart→End). Sem janela válida cai no valor cheio;
 * ciclo já vencido = 0 (nada a cobrar até a renovação, que já traz o addon na recorrência).
 */
export function prorataCents(
  sub: Pick<Subscription, 'currentPeriodStart' | 'currentPeriodEnd'>,
  cycleCents: number,
  now: Date,
): number {
  const start = sub.currentPeriodStart;
  const end = sub.currentPeriodEnd;
  if (!start || !end) return cycleCents;
  const total = end.getTime() - start.getTime();
  const remaining = end.getTime() - now.getTime();
  if (total <= 0 || remaining <= 0) return 0;
  if (remaining >= total) return cycleCents;
  return Math.round(cycleCents * (remaining / total));
}

/**
 * "Este Tenant pode usar esta feature?" - resposta única para pagamentos online,
 * webhooks, equipe (múltiplos profissionais) e o addon do bot. Lê do snapshot da
 * assinatura (grandfather), nunca do catálogo ao vivo.
 */
export function hasFeature(sub: Subscription | null | undefined, feature: FeatureKey): boolean {
  if (!isSubscriptionActive(sub) || !sub) return false;
  switch (feature) {
    case 'onlinePayments':
      return sub.featOnlinePayments;
    case 'webhooks':
      return sub.featWebhooks;
    case 'team':
      return sub.featTeam;
    case 'aiAttendant':
      return isAddonActive(sub);
  }
}

// --- Equipe: profissionais x recepcionistas ----------------------------------

/** Profissionais (usuários com agenda própria) já cadastrados no tenant. */
export async function getProfessionalUsage(tenantId: string): Promise<number> {
  return prisma.user.count({ where: { tenantId, isProfessional: true } });
}

/** Recepcionistas (usuários de apoio, sem agenda) já cadastrados no tenant. */
export async function getReceptionistUsage(tenantId: string): Promise<number> {
  return prisma.user.count({ where: { tenantId, isProfessional: false } });
}

/** True se ainda cabe mais um profissional no plano (limite null = ilimitado). */
export function canAddProfessional(sub: Subscription | null | undefined, used: number): boolean {
  const limit = sub?.maxProfessionals ?? null;
  return limit === null || used < limit;
}

/** True se ainda cabe mais um recepcionista no plano (limite null = ilimitado). */
export function canAddReceptionist(sub: Subscription | null | undefined, used: number): boolean {
  const limit = sub?.maxReceptionists ?? null;
  return limit === null || used < limit;
}

// --- Uso mensal --------------------------------------------------------------

/** Intervalo [início, fim) do mês civil corrente (UTC). Âncora-padrão sem ciclo. */
function monthRange(now: Date): { gte: Date; lt: Date } {
  const gte = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const lt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { gte, lt };
}

/** Dia do mês `d` no mês (y,m), com clamp p/ meses curtos (31 → 28/29/30). UTC. */
function anchorDay(y: number, m: number, d: number): Date {
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(d, lastDay)));
}

/**
 * Janela de cota MENSAL ancorada no dia do ciclo de cobrança (item 6: reset a cada
 * início de ciclo). O teto é sempre mensal (250/mês etc.), então mesmo no plano ANUAL
 * a janela é de um mês ancorada no dia da assinatura - não o ano inteiro. Sem período
 * na assinatura (ainda não cobrada) cai no mês civil. Upgrade no meio do ciclo mantém
 * a mesma janela (não zera a contagem) e o teto novo já vale, pois vem do snapshot.
 * UTC: o desvio de fuso não move a fronteira de cota de forma relevante.
 */
export function cycleWindow(
  sub: Subscription | null | undefined,
  now = new Date(),
): { gte: Date; lt: Date } {
  const start = sub?.currentPeriodStart ?? null;
  if (!start) return monthRange(now);
  const d = start.getUTCDate();
  let gte = anchorDay(now.getUTCFullYear(), now.getUTCMonth(), d);
  if (now < gte) gte = anchorDay(now.getUTCFullYear(), now.getUTCMonth() - 1, d);
  const lt = anchorDay(gte.getUTCFullYear(), gte.getUTCMonth() + 1, d);
  return { gte, lt };
}

/** Agendamentos criados na janela (exclui cancelados). Conta sob demanda via índice. */
export async function getMonthlyAppointmentUsage(
  tenantId: string,
  now = new Date(),
  window?: { gte: Date; lt: Date },
): Promise<number> {
  const { gte, lt } = window ?? monthRange(now);
  return prisma.appointment.count({
    where: { tenantId, createdAt: { gte, lt }, status: { not: 'CANCELED' } },
  });
}

/** Turnos do bot na janela (uma linha em AiUsageLog por turno). Base do custo de IA. */
export async function getMonthlyAiUsage(
  tenantId: string,
  now = new Date(),
  window?: { gte: Date; lt: Date },
): Promise<number> {
  const { gte, lt } = window ?? monthRange(now);
  return prisma.aiUsageLog.count({ where: { tenantId, createdAt: { gte, lt } } });
}

/**
 * Conversas da janela para o teto do addon = conversas com ≥1 mensagem inbound nela.
 * ponytail: proxy da "conversa de 24h" que a Meta cobra; refinar p/ janelas exatas de
 * 24h se a cobrança do addon precisar bater centavo a centavo com a fatura da Meta.
 */
export async function getMonthlyConversationUsage(
  tenantId: string,
  now = new Date(),
  window?: { gte: Date; lt: Date },
): Promise<number> {
  const { gte, lt } = window ?? monthRange(now);
  return prisma.conversation.count({
    where: { tenantId, messages: { some: { direction: 'INBOUND', createdAt: { gte, lt } } } },
  });
}

export interface UsageMetric {
  used: number;
  /** null = ilimitado (Enterprise / sem assinatura / sem addon). */
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

/** Uso do ciclo + limites do snapshot da assinatura, pronto para o banner. */
export async function getUsageStatus(
  tenant: TenantWithSubscription,
  now = new Date(),
): Promise<UsageStatus> {
  const sub = tenant.subscription ?? null;
  const window = cycleWindow(sub, now);
  const [appts, ai] = await Promise.all([
    getMonthlyAppointmentUsage(tenant.id, now, window),
    getMonthlyAiUsage(tenant.id, now, window),
  ]);
  return {
    appointments: metric(appts, sub?.appointmentsLimit ?? null),
    aiMessages: metric(ai, sub?.aiMessagesLimit ?? null),
  };
}

/**
 * Uso de conversas do ciclo x teto do addon (snapshot). Métrica separada do plano base
 * (agendamentos), pois o addon tem teto próprio. limit null = sem addon/ilimitado.
 */
export async function getAddonUsageStatus(
  tenant: TenantWithSubscription,
  now = new Date(),
): Promise<UsageMetric> {
  const sub = tenant.subscription ?? null;
  const used = await getMonthlyConversationUsage(tenant.id, now, cycleWindow(sub, now));
  return metric(used, sub?.addonConversationsLimit ?? null);
}

/** True se o uso do mês atingiu/passou o teto. limit null (ilimitado) => nunca bloqueia. */
export function isOverLimit(m: UsageMetric): boolean {
  return m.limit != null && m.used >= m.limit;
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

// --- Bloqueio owner-side + alertas de push (email/WhatsApp) -------------------

/**
 * Fair use: Multi (NEGOCIO) com addon Multi (BOT_MULTI) ativo. Para essa faixa o topo
 * do teto NÃO bloqueia - o excedente vira conversa de upgrade p/ Enterprise (alerta
 * interno pro operador). Ver nextUsageAlerts / isAppointmentLimitReached.
 */
export function isFairUse(sub: Subscription | null | undefined): boolean {
  return isAddonActive(sub) && sub!.planTier === 'NEGOCIO' && sub!.addonTier === 'BOT_MULTI';
}

/**
 * True se o tenant atingiu o teto de agendamentos do ciclo - usado SÓ pelos guards
 * owner-side (criar serviço/profissional/agendamento manual). Fair use e assinatura
 * inativa nunca bloqueiam por cota (o acesso inativo é tratado por hasFeature/banner).
 * REGRA DURA: jamais no caminho do cliente final.
 */
export async function isAppointmentLimitReached(
  tenant: TenantWithSubscription,
  now = new Date(),
): Promise<boolean> {
  const sub = tenant.subscription ?? null;
  if (!isSubscriptionActive(sub) || sub!.appointmentsLimit == null || isFairUse(sub)) return false;
  const used = await getMonthlyAppointmentUsage(tenant.id, now, cycleWindow(sub, now));
  return used >= sub!.appointmentsLimit;
}

export type UsageAlertMetric = 'appointments' | 'conversations' | 'fairuse';

export interface PendingUsageAlert {
  /** Chave de dedup: 'appointments' | 'conversations' | 'fairuse'. */
  metric: UsageAlertMetric;
  /** Maior limiar recém-cruzado: 85 | 90 | 95 | 100. */
  level: 85 | 90 | 95 | 100;
  used: number;
  limit: number;
  /** Início da janela de cota (chave de dedup por ciclo). */
  windowStart: Date;
  /** true = alerta INTERNO pro operador (fair use), não pro dono. */
  fairUse: boolean;
  /** Qual teto estourou (só no fair use, p/ o texto do alerta interno). */
  underlyingMetric?: 'appointments' | 'conversations';
}

/**
 * Alertas de push (email/WhatsApp) que ainda NÃO saíram neste ciclo. Compara o nível de
 * uso atual (agendamentos + conversas do addon) com o maior nível já alertado na janela
 * (tabela UsageAlert) e devolve só o que SUBIU de nível - nunca repete o mesmo alerta no
 * mesmo ciclo nem alerta "pra trás" quando o uso oscila (item: não spam). Fair use:
 * abaixo de 100% não incomoda o dono; ao passar do teto emite UM alerta interno. Só
 * assinatura ativa alerta. O caller (loop do bot) despacha os canais e chama depois
 * markUsageAlertSent. O banner in-app é status ao vivo e não passa por aqui.
 */
export async function nextUsageAlerts(
  tenant: TenantWithSubscription,
  now = new Date(),
): Promise<PendingUsageAlert[]> {
  const sub = tenant.subscription ?? null;
  if (!isSubscriptionActive(sub)) return [];

  const window = cycleWindow(sub, now);
  const windowStart = window.gte;
  const sent = await prisma.usageAlert.findMany({
    where: { tenantId: tenant.id, windowStart },
    select: { metric: true, level: true },
  });
  const sentLevel = (m: UsageAlertMetric) => sent.find((s) => s.metric === m)?.level ?? 0;

  const apptUsed = await getMonthlyAppointmentUsage(tenant.id, now, window);
  const appts = metric(apptUsed, sub!.appointmentsLimit ?? null);
  const conv = isAddonActive(sub)
    ? metric(
        await getMonthlyConversationUsage(tenant.id, now, window),
        sub!.addonConversationsLimit ?? null,
      )
    : null;

  const out: PendingUsageAlert[] = [];

  // Fair use: só o excedente (100%) importa, e vira alerta interno uma vez por ciclo.
  if (isFairUse(sub)) {
    const overConv = conv != null && isOverLimit(conv);
    const overAppt = isOverLimit(appts);
    if ((overConv || overAppt) && sentLevel('fairuse') < 100) {
      const m = overConv ? conv! : appts;
      out.push({
        metric: 'fairuse',
        level: 100,
        used: m.used,
        limit: m.limit!,
        windowStart,
        fairUse: true,
        underlyingMetric: overConv ? 'conversations' : 'appointments',
      });
    }
    return out;
  }

  const consider = (key: 'appointments' | 'conversations', m: UsageMetric | null) => {
    if (!m || m.limit == null) return;
    // Nível 100 SÓ no over-limit REAL (used >= limit), igual ao bloqueio owner-side e ao
    // fair use. Abaixo disso o pct arredondado é capado em 95 - 249/250 arredonda p/ 100%
    // mas ainda NÃO estourou: manda o alerta de 95 (urgente), não o terminal (que diria
    // falsamente "criações pausadas" e consumiria o dedup antes do bloqueio de fato ligar).
    const level = isOverLimit(m) ? 100 : Math.min(alertLevel(m.pct), 95);
    if (level >= 85 && level > sentLevel(key)) {
      out.push({
        metric: key,
        level: level as 85 | 90 | 95 | 100,
        used: m.used,
        limit: m.limit,
        windowStart,
        fairUse: false,
      });
    }
  };
  consider('appointments', appts);
  consider('conversations', conv);

  return out;
}

/** Registra que o alerta de `level` já saiu p/ (tenant, métrica, janela). Idempotente. */
export async function markUsageAlertSent(
  tenantId: string,
  metric: UsageAlertMetric,
  windowStart: Date,
  level: number,
): Promise<void> {
  await prisma.usageAlert.upsert({
    where: { tenantId_metric_windowStart: { tenantId, metric, windowStart } },
    create: { tenantId, metric, windowStart, level },
    update: { level },
  });
}
