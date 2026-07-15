import { nextUsageAlerts, markUsageAlertSent, type PendingUsageAlert } from '@haru/billing';

import { Sentry } from '../instrument.js';
import { emailFairUseExceeded, emailUsageAlert } from './email.js';
import prisma from './prisma.js';

const USAGE_TICK_INTERVAL_MS = 30 * 60 * 1000;

const USAGE_LABEL = {
  whatsappReminders: 'lembretes por WhatsApp',
  conversations: 'conversas do bot',
} as const;

// Graph API do número da PLATAFORMA (não o do tenant) - envio de template pro DONO.
const GRAPH_URL = 'https://graph.facebook.com/v21.0';

/** Resolve destino + opt-in do alerta WhatsApp pro dono. null = não enviar. */
async function ownerWhatsappTarget(
  tenantId: string,
): Promise<{ phone: string; tenantName: string } | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true, ownerWhatsappAlertsEnabled: true },
  });
  if (!tenant?.ownerWhatsappAlertsEnabled) return null;
  const owner = await prisma.user.findFirst({
    where: { tenantId, role: 'OWNER' },
    select: { phone: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!owner?.phone) return null;
  return { phone: owner.phone, tenantName: tenant.name };
}

/**
 * Alerta de uso pro dono por WhatsApp - reforço opt-in do eixo de CONVERSAS do addon (só
 * 90/95/100, não 85, pra não spamar). O eixo de lembretes por WhatsApp NÃO usa este canal (a
 * regra é email + banner); o caller só chama isto para a métrica 'conversations'. Enviado pelo
 * número da PLATAFORMA Demandaê (envs WHATSAPP_PLATFORM_*), NUNCA pelo número do bot do tenant.
 * Env-gated + fail-soft: no-op se faltar número/token/template. Requer template aprovado na
 * Meta na conta da plataforma (README: demandae_usage_alert). O e-mail sempre cobre o dono.
 */
async function sendUsageAlertWhatsApp(tenantId: string, alert: PendingUsageAlert): Promise<void> {
  if (alert.level < 90) return;
  const phoneNumberId = process.env.WHATSAPP_PLATFORM_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_PLATFORM_ACCESS_TOKEN;
  const template = process.env.WHATSAPP_TEMPLATE_USAGE_ALERT;
  if (!phoneNumberId || !token || !template) return;
  const target = await ownerWhatsappTarget(tenantId);
  if (!target) return;

  const resource =
    alert.metric === 'whatsappReminders' ? USAGE_LABEL.whatsappReminders : USAGE_LABEL.conversations;
  const pct = Math.round((alert.used / alert.limit) * 100);
  // Params na ORDEM aprovada na Meta: {{1}} negócio, {{2}} recurso, {{3}} %. Ver README.
  const params = [target.tenantName, resource, `${pct}%`];
  try {
    const res = await fetch(`${GRAPH_URL}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: target.phone,
        type: 'template',
        template: {
          name: template,
          language: { code: 'pt_BR' },
          components: [
            { type: 'body', parameters: params.map((text) => ({ type: 'text', text })) },
          ],
        },
      }),
    });
    if (!res.ok) {
      console.error(
        '[usage-alerts] WhatsApp plataforma',
        res.status,
        await res.text().catch(() => ''),
      );
    }
  } catch (err) {
    console.error('[usage-alerts] WhatsApp plataforma falhou', err);
  }
}

/**
 * Notificação in-app (sino do painel web) do alerta de uso. Best-effort: nunca lança (não
 * bloqueia o markUsageAlertSent). Dedup vem do caller (UsageAlert - um por nível/ciclo).
 */
async function createUsageNotification(tenantId: string, alert: PendingUsageAlert): Promise<void> {
  const isReminders = alert.metric === 'whatsappReminders';
  const label = isReminders ? USAGE_LABEL.whatsappReminders : USAGE_LABEL.conversations;
  const pct = Math.round((alert.used / alert.limit) * 100);
  const atLimit = alert.level >= 100;
  try {
    await prisma.notification.create({
      data: {
        tenantId,
        channel: 'ACCOUNT',
        kind: `usage.${alert.metric}.${alert.level}`,
        title: atLimit ? `Limite de ${label} atingido` : `${pct}% dos ${label} usados`,
        body: atLimit
          ? isReminders
            ? `Você chegou ao teto de ${label} do seu plano neste ciclo (${alert.used}/${alert.limit}). Os lembretes agora vão só por e-mail e push (ilimitados) e voltam por WhatsApp no reset do ciclo - seus clientes continuam agendando. Faça upgrade pra ampliar a cota.`
            : `Você chegou ao teto de ${label} do seu plano neste ciclo (${alert.used}/${alert.limit}). Faça upgrade pra ampliar a cota.`
          : `Você já usou ${pct}% dos ${label} do seu plano neste ciclo (${alert.used}/${alert.limit}).`,
        ctaLabel: 'Ver planos',
        ctaHref: '/assinatura',
      },
    });
  } catch (err) {
    console.error('[usage-alerts] notificação in-app falhou', tenantId, err);
  }
}

/**
 * Varre as assinaturas ATIVAS e dispara os alertas de uso que subiram de nível neste
 * ciclo (email pro dono + gancho WhatsApp; fair use vira alerta interno pro operador).
 * A decisão + dedup vivem em @haru/billing (nextUsageAlerts lê a tabela UsageAlert);
 * aqui só entregamos os canais e carimbamos. Best-effort: falha de um tenant/alerta é
 * logada e não derruba o loop. Espelha o padrão de processQualityCheck.
 */
async function processUsageAlerts() {
  const now = new Date();
  const subs = await prisma.subscription.findMany({
    where: { status: 'ACTIVE' },
    include: { tenant: { select: { id: true, name: true } } },
  });

  for (const sub of subs) {
    let pending: PendingUsageAlert[];
    try {
      pending = await nextUsageAlerts({ id: sub.tenantId, subscription: sub }, now);
    } catch (err) {
      console.error('[usage-alerts] falha ao avaliar tenant', sub.tenantId, err);
      Sentry.captureException(err, { tags: { component: 'usage-alerts', phase: 'evaluate' } });
      continue;
    }

    for (const a of pending) {
      try {
        if (a.fairUse) {
          await emailFairUseExceeded({
            tenantId: sub.tenantId,
            tenantName: sub.tenant.name,
            used: a.used,
            limit: a.limit,
          });
        } else {
          await emailUsageAlert(sub.tenantId, {
            metric: a.metric as 'whatsappReminders' | 'conversations',
            level: a.level,
            used: a.used,
            limit: a.limit,
          });
          // Reforço owner-WhatsApp só no eixo de conversas do addon; lembretes = email + banner.
          if (a.metric === 'conversations') await sendUsageAlertWhatsApp(sub.tenantId, a);
          await createUsageNotification(sub.tenantId, a);
        }
        // Carimba DEPOIS de tentar despachar. Best-effort: se um canal falhar não
        // reenvia no ciclo (evita flood a cada tick); retentativa = apagar a linha.
        await markUsageAlertSent(sub.tenantId, a.metric, a.windowStart, a.level);
      } catch (err) {
        console.error('[usage-alerts] falha ao despachar', sub.tenantId, a.metric, a.level, err);
        Sentry.captureException(err, { tags: { component: 'usage-alerts', phase: 'dispatch' } });
      }
    }
  }
}

/**
 * Inicia o loop de alertas de uso. Roda uma vez ao subir e depois a cada 30 min. Como o
 * setInterval não sobrevive a restart, a idempotência vem do marcador no banco
 * (UsageAlert), não da memória - igual aos loops de lembrete/qualidade.
 */
export function startUsageAlertLoop(): void {
  console.log(`[usage-alerts] loop iniciado (tick a cada ${USAGE_TICK_INTERVAL_MS / 1000}s)`);

  const tick = () => {
    processUsageAlerts().catch((err) => {
      console.error('[usage-alerts] erro no tick', err);
      Sentry.captureException(err, { tags: { component: 'usage-alerts' } });
    });
  };

  tick();
  setInterval(tick, USAGE_TICK_INTERVAL_MS);
}
