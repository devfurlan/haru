import { prisma } from '@haru/database';
import { recurringValueCents } from '@haru/billing';

import { onRenewalUpcoming } from '@/lib/comms/events';
import { emitInvoiceForCharge } from '@/lib/billing/ledger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Cron diário de comunicação de retenção do web (Vercel Cron - ver apps/web/vercel.json).
 * Hoje: lembrete de RENOVAÇÃO (7 dias antes do fim do ciclo). Os alertas de USO NÃO ficam
 * aqui - rodam no loop do bot (dono do detector + dedup por UsageAlert).
 *
 * Protegido por CRON_SECRET (a Vercel manda `Authorization: Bearer <CRON_SECRET>`). Sem o
 * secret configurado, recusa (fail-closed) pra não expor o disparo.
 */

const RENEWAL_LEAD_DAYS = 7;
/** Teto de retentativa de emissão de NF (evita loop de erro numa cobrança problemática). */
const MAX_NF_ATTEMPTS = 4;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const now = new Date();
  const horizon = new Date(now.getTime() + RENEWAL_LEAD_DAYS * 24 * 60 * 60 * 1000);

  // Ativas que renovam em <= 7 dias e ainda não foram lembradas neste ciclo. Canceladas não
  // entram (não renovam). renewalReminderSentAt é resetado a null no webhook de renovação.
  const subs = await prisma.subscription.findMany({
    where: {
      status: 'ACTIVE',
      renewalReminderSentAt: null,
      currentPeriodEnd: { gt: now, lte: horizon },
    },
  });

  let sent = 0;
  for (const sub of subs) {
    if (!sub.currentPeriodEnd) continue;
    try {
      await onRenewalUpcoming(sub.tenantId, {
        renewsAt: sub.currentPeriodEnd,
        amountCents: recurringValueCents(sub),
        cycle: sub.billingCycle,
      });
      // Carimba DEPOIS de despachar (best-effort): não relembra no mesmo ciclo. Retentativa
      // = apagar o marcador. Igual ao padrão do dedup de alerta de uso.
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { renewalReminderSentAt: now },
      });
      sent++;
    } catch (err) {
      console.error('[cron-comms] lembrete de renovação falhou p/ sub', sub.id, err);
    }
  }

  // Retentativa de NF: cobranças cuja emissão falhou, dentro do teto de tentativas. O
  // emitInvoiceForCharge faz o claim atômico (FAILED→PENDING) e reagenda a nota no Asaas -
  // seguro porque FAILED = nenhuma nota válida existe. PENDING "preso" não entra aqui (a
  // autorização pode só estar atrasada; retentar duplicaria).
  const failedNf = await prisma.charge.findMany({
    where: { nfStatus: 'FAILED', nfAttempts: { lt: MAX_NF_ATTEMPTS } },
    select: { id: true },
  });
  let nfRetried = 0;
  for (const c of failedNf) {
    try {
      await emitInvoiceForCharge(c.id);
      nfRetried++;
    } catch (err) {
      console.error('[cron-comms] retentativa de NF falhou p/ charge', c.id, err);
    }
  }

  return Response.json({ ok: true, checked: subs.length, sent, nfRetried });
}
