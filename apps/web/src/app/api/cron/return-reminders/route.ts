import * as Sentry from '@sentry/nextjs';

import { dispatchReturnReminders } from '@/lib/comms/return-reminder';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Cron do LEMBRETE DE RETORNO (Vercel Cron - ver apps/web/vercel.json). Diário: cutuca o
 * cliente pra reagendar quando chega a hora do próximo atendimento (preventivo). Vale em
 * TODOS os planos (retenção, sem gate de tier).
 *
 * A unique (contactId, serviceId, cycleAnchor) da tabela ReturnReminder + o min-gap por
 * contato garantem idempotência (retry da Vercel não duplica). Falha por contato/tenant é
 * engolida no dispatch (uma linha quebrada não para a fila). Protegido por CRON_SECRET
 * (fail-closed, igual aos outros crons). Horário 0 14 UTC (11:00 BRT) - distinto dos
 * outros crons ao cliente pra espalhar os envios pelo dia.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const res = await dispatchReturnReminders(new Date());
    return Response.json({ ok: true, ...res });
  } catch (err) {
    console.error('[cron-return-reminders] falhou', err);
    Sentry.captureException(err, { tags: { component: 'cron-return-reminders' } });
    return Response.json({ ok: false }, { status: 500 });
  }
}
