import { prisma } from '@haru/database';
import type { Plan, PlanTier, Subscription } from '@haru/database';

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
 * O plano PÚBLICO de um tier - o que a vitrine lista e o self-serve contrata. `Plan.tier`
 * NÃO é único (planos PERSONALIZADOS dividem o mesmo tier com `active: false`), mas o índice
 * parcial `Plan_tier_active_key` garante no máximo UM público por tier, então este findFirst
 * é determinístico. Planos personalizados nunca saem por aqui: são atribuídos por id no
 * admin. null = tier sem plano público (ex.: ENTERPRISE, que é "sob consulta").
 */
export async function getPublicPlan(tier: PlanTier): Promise<Plan | null> {
  return prisma.plan.findFirst({ where: { tier, active: true } });
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
    case 'waitlist':
      return sub.featWaitlist;
    case 'serviceSubscriptions':
      return sub.featServiceSubscriptions;
    case 'commissions':
      return sub.featCommissions;
    case 'aiAttendant':
      return isAddonActive(sub);
  }
}

/**
 * Fila de espera (recuperação de vaga em dia lotado). Lê a flag do SNAPSHOT - o plano
 * contratado é que decide, não o tier: nos planos públicos ela vem do Time pra cima, mas um
 * plano personalizado pode ligá-la em qualquer tier. Sem assinatura ativa não libera (trial
 * futuro, se existir, entra em isSubscriptionActive e a fila herda de graça).
 */
export function hasWaitlist(sub: Subscription | null | undefined): boolean {
  return hasFeature(sub, 'waitlist');
}

/**
 * Assinatura de serviços do cliente final ("Clube do Corte") + pacotes. Lê a flag do
 * SNAPSHOT (o plano contratado decide, não o tier). Gate NÃO-BURLÁVEL: cada write que move
 * dinheiro/cria linha (dono cria/edita plano, cliente assina, cobrança recorrente) chama
 * isto no corpo da action, não só esconde no front. REGRA DURA: gateia OFERTAR/COBRAR, nunca
 * o CONSUMO de crédito já vendido - um dono que faz downgrade não estorna quem já assinou (o
 * crédito pago continua honrado; ver isSubscriptionActive da própria Membership).
 */
export function hasServiceSubscriptions(sub: Subscription | null | undefined): boolean {
  return hasFeature(sub, 'serviceSubscriptions');
}

/**
 * Comissões/financeiro por profissional (config de remuneração + fechamento). Lê a flag do
 * SNAPSHOT (o plano contratado decide, não o tier). Feature de equipe: nos planos públicos vem
 * do Multi pra cima, mas um plano personalizado pode ligá-la em qualquer tier (admin).
 */
export function hasCommissions(sub: Subscription | null | undefined): boolean {
  return hasFeature(sub, 'commissions');
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

/**
 * Lembretes por WhatsApp ENVIADOS na janela = agendamentos com `reminderSentAt` dentro do
 * ciclo. O carimbo é setado só no envio WhatsApp bem-sucedido (apps/bot reminders.ts), então
 * conta exatamente os lembretes que saíram por WhatsApp - a ÚNICA quota do plano base.
 * ponytail: proxy de "lembretes de agendamento" - a remarcação zera o carimbo e reenvia, e
 * confirmações/cancelamentos não contam. Contador dedicado só se a cota tiver que contar TODO
 * disparo WhatsApp.
 */
export async function getMonthlyWhatsappReminderUsage(
  tenantId: string,
  now = new Date(),
  window?: { gte: Date; lt: Date },
): Promise<number> {
  const { gte, lt } = window ?? monthRange(now);
  return prisma.appointment.count({
    where: { tenantId, reminderSentAt: { gte, lt } },
  });
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
  /** Uso do ciclo x cota de lembretes por WhatsApp - única quota do plano base. */
  whatsappReminders: UsageMetric;
}

function metric(used: number, limit: number | null): UsageMetric {
  return { used, limit, pct: limit && limit > 0 ? Math.round((used / limit) * 100) : null };
}

/** Uso do ciclo + cota de lembretes do snapshot da assinatura, pronto para o banner. */
export async function getUsageStatus(
  tenant: TenantWithSubscription,
  now = new Date(),
): Promise<UsageStatus> {
  const sub = tenant.subscription ?? null;
  const used = await getMonthlyWhatsappReminderUsage(tenant.id, now, cycleWindow(sub, now));
  return { whatsappReminders: metric(used, sub?.whatsappRemindersLimit ?? null) };
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
 * Maior limiar de alerta atingido para um percentual de uso, na escada do addon
 * (conversas do bot): 0 = abaixo de 85%; 100 = limite excedido. A quota de lembretes
 * WhatsApp do plano base usa a escada de 2 níveis (80/100) inline em nextUsageAlerts.
 */
export function alertLevel(pct: number | null): 0 | 85 | 90 | 95 | 100 {
  if (pct === null) return 0;
  if (pct >= 100) return 100;
  if (pct >= 95) return 95;
  if (pct >= 90) return 90;
  if (pct >= 85) return 85;
  return 0;
}

// --- Alertas de push (email/WhatsApp/in-app) ---------------------------------
// NB: agendamento é ilimitado - não existe mais bloqueio owner-side por cota. A quota do
// plano base (lembretes WhatsApp) é enforçada NO ENVIO, pausando só o canal WhatsApp no
// loop de lembretes do bot (email/push seguem); ver apps/bot/src/lib/reminders.ts.

/**
 * Fair use: Multi (NEGOCIO) com addon Multi (BOT_MULTI) ativo. Só se aplica ao eixo de
 * CONVERSAS do addon: para essa faixa o topo do teto de conversas NÃO bloqueia - o excedente
 * vira conversa de upgrade p/ Enterprise (alerta interno pro operador). Ver nextUsageAlerts.
 */
export function isFairUse(sub: Subscription | null | undefined): boolean {
  return isAddonActive(sub) && sub!.planTier === 'NEGOCIO' && sub!.addonTier === 'BOT_MULTI';
}

export type UsageAlertMetric = 'whatsappReminders' | 'conversations' | 'fairuse';

export interface PendingUsageAlert {
  /** Chave de dedup: 'whatsappReminders' | 'conversations' | 'fairuse'. */
  metric: UsageAlertMetric;
  /** Limiar recém-cruzado. Lembretes: 80 | 100. Conversas: 85 | 90 | 95 | 100. */
  level: 80 | 85 | 90 | 95 | 100;
  used: number;
  limit: number;
  /** Início da janela de cota (chave de dedup por ciclo). */
  windowStart: Date;
  /** true = alerta INTERNO pro operador (fair use), não pro dono. */
  fairUse: boolean;
  /** Qual teto estourou (só no fair use do addon, p/ o texto do alerta interno). */
  underlyingMetric?: 'conversations';
}

/**
 * Alertas de push (email/WhatsApp/in-app) que ainda NÃO saíram neste ciclo. Compara o nível
 * de uso atual com o maior já alertado na janela (tabela UsageAlert) e devolve só o que SUBIU
 * de nível - nunca repete o mesmo alerta no ciclo nem alerta "pra trás" quando o uso oscila.
 * Dois eixos: LEMBRETES por WhatsApp (plano base, escada 80/100) e CONVERSAS do addon (escada
 * 85/90/95/100, com fair use no Multi+BotMulti). Só assinatura ativa alerta. O caller (loop do
 * bot) despacha os canais e chama depois markUsageAlertSent. O banner in-app é status ao vivo.
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

  const out: PendingUsageAlert[] = [];

  // Eixo base: lembretes por WhatsApp. Escada de 2 níveis - avisa uma vez em 80% (email +
  // banner) e uma vez em 100% (o canal WhatsApp pausa; email/push seguem ilimitados). Vale
  // inclusive no fair use (o pause de canal não tem exceção). limit null (Enterprise) = sem cota.
  const remLimit = sub!.whatsappRemindersLimit ?? null;
  if (remLimit != null) {
    const rem = metric(await getMonthlyWhatsappReminderUsage(tenant.id, now, window), remLimit);
    const level = isOverLimit(rem) ? 100 : rem.pct != null && rem.pct >= 80 ? 80 : 0;
    if (level > 0 && level > sentLevel('whatsappReminders')) {
      out.push({
        metric: 'whatsappReminders',
        level: level as 80 | 100,
        used: rem.used,
        limit: rem.limit!,
        windowStart,
        fairUse: false,
      });
    }
  }

  // Eixo addon: conversas do bot (só com addon ativo).
  if (isAddonActive(sub)) {
    const conv = metric(
      await getMonthlyConversationUsage(tenant.id, now, window),
      sub!.addonConversationsLimit ?? null,
    );
    if (conv.limit != null) {
      if (isFairUse(sub)) {
        // Multi + Bot Multi: o topo do teto de conversas não bloqueia; o excedente vira UM
        // alerta interno pro operador (conversa de upgrade p/ Enterprise).
        if (isOverLimit(conv) && sentLevel('fairuse') < 100) {
          out.push({
            metric: 'fairuse',
            level: 100,
            used: conv.used,
            limit: conv.limit,
            windowStart,
            fairUse: true,
            underlyingMetric: 'conversations',
          });
        }
      } else {
        // Nível 100 SÓ no over-limit REAL (used >= limit); abaixo disso o pct arredondado é
        // capado em 95 (249/250 arredonda p/ 100% mas ainda não estourou).
        const level = isOverLimit(conv) ? 100 : Math.min(alertLevel(conv.pct), 95);
        if (level >= 85 && level > sentLevel('conversations')) {
          out.push({
            metric: 'conversations',
            level: level as 85 | 90 | 95 | 100,
            used: conv.used,
            limit: conv.limit,
            windowStart,
            fairUse: false,
          });
        }
      }
    }
  }

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
