import * as Sentry from '@sentry/nextjs';

import { dispatchReviewInvites } from '@/lib/comms/review-invite';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Cron do CONVITE PÓS-ATENDIMENTO (Vercel Cron - ver apps/web/vercel.json). Hourly: convida
 * quem terminou o atendimento há ~1h (REVIEW_INVITE_DELAY_HOURS) e ainda não foi convidado
 * nem avaliou. Vale em TODOS os planos (retenção/prova social, sem gate de tier).
 *
 * A janela + o carimbo reviewInviteSentAt garantem idempotência (retry da Vercel não
 * duplica). Falha por atendimento é engolida dentro do dispatch (uma linha quebrada não para
 * a fila). Protegido por CRON_SECRET (fail-closed, igual aos outros crons).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const res = await dispatchReviewInvites(new Date());
    return Response.json({ ok: true, ...res });
  } catch (err) {
    console.error('[cron-review-invites] falhou', err);
    Sentry.captureException(err, { tags: { component: 'cron-review-invites' } });
    return Response.json({ ok: false }, { status: 500 });
  }
}
