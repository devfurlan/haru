import 'server-only';

import type { BillingCycle } from '@haru/database';

import { emailPaymentFailed, emailRenewalUpcoming } from '@/lib/billing/email';
import { appUrl } from '@/lib/email';

import { paymentFailedWaParams, pastDueNotif, renewalNotif } from './copy';
import { createNotification } from './notifications';
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
