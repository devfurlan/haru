import 'server-only';

import type { BillingCycle, WeeklyReportChannel } from '@haru/database';

import { emailPaymentFailed, emailRenewalUpcoming } from '@/lib/billing/email';
import { appUrl } from '@/lib/email';
import type { WeeklyReportData } from '@/lib/weekly-report-core';

import { paymentFailedWaParams, pastDueNotif, renewalNotif, weeklyReportWaParams } from './copy';
import { createNotification } from './notifications';
import { emailWeeklyReport } from './weekly-report-email';
import { resolveOwnerWhatsapp, sendPlatformWhatsapp } from './whatsapp';

/**
 * Fan-out multi-canal dos eventos de billing que atingem mais de um canal. Cada canal é
 * best-effort e independente (Promise.allSettled): a falha de um nunca derruba o webhook/
 * cron nem impede os outros. Eventos de canal único (boas-vindas, recibo, addon) são
 * disparados direto pelo sender, sem passar por aqui.
 */

/**
 * Cobrança falhou (webhook PAST_DUE): e-mail + notificação in-app + WhatsApp opt-in.
 * O WhatsApp aponta pra /assinatura (onde fica o botão de atualizar cartão).
 */
export async function onPaymentFailed(tenantId: string): Promise<void> {
  await Promise.allSettled([
    emailPaymentFailed(tenantId),
    createNotification(tenantId, 'ACCOUNT', 'billing.past_due', pastDueNotif()),
    (async () => {
      const target = await resolveOwnerWhatsapp(tenantId);
      if (!target) return;
      await sendPlatformWhatsapp(
        target.phone,
        process.env.WHATSAPP_TEMPLATE_PAYMENT_FAILED,
        paymentFailedWaParams(target.tenantName, `${appUrl()}/assinatura`),
      );
    })(),
  ]);
}

/**
 * Relatório semanal (cron de segunda de manhã): e-mail completo e/ou resumo curto no
 * WhatsApp, conforme a escolha do dono em /settings. Sem sino in-app de propósito - o
 * relatório não é um alerta acionável de conta, é leitura.
 *
 * O WhatsApp ainda passa pelo opt-in de alertas do dono (resolveOwnerWhatsapp): se ele
 * escolheu WhatsApp mas nunca ligou os alertas / não tem telefone, o canal simplesmente
 * não sai - e o e-mail cobre quando o canal é BOTH.
 */
export async function onWeeklyReport(
  tenantId: string,
  data: WeeklyReportData,
  channel: WeeklyReportChannel,
): Promise<void> {
  // O "relatório completo" é o próprio e-mail; no WhatsApp o link leva pro painel, que é
  // onde o dono continua a análise. ponytail: sem página dedicada de snapshot por ora.
  const reportUrl = `${appUrl()}/dashboard`;
  const jobs: Promise<unknown>[] = [];

  if (channel !== 'WHATSAPP') jobs.push(emailWeeklyReport(tenantId, data, reportUrl));
  if (channel !== 'EMAIL') {
    jobs.push(
      (async () => {
        const target = await resolveOwnerWhatsapp(tenantId);
        if (!target) return;
        await sendPlatformWhatsapp(
          target.phone,
          process.env.WHATSAPP_TEMPLATE_WEEKLY_REPORT,
          weeklyReportWaParams(target.tenantName, data, reportUrl),
        );
      })(),
    );
  }
  await Promise.allSettled(jobs);
}

/** Renovação próxima (cron, 7 dias antes): e-mail + notificação in-app. */
export async function onRenewalUpcoming(
  tenantId: string,
  data: { renewsAt: Date; amountCents: number | null; cycle: BillingCycle },
): Promise<void> {
  await Promise.allSettled([
    emailRenewalUpcoming(tenantId, data),
    createNotification(
      tenantId,
      'ACCOUNT',
      'renewal.upcoming',
      renewalNotif(data.renewsAt, data.amountCents),
    ),
  ]);
}
