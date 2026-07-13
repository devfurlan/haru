import { advanceWaitlistWaves } from '@/lib/waitlist';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Cron da FILA DE ESPERA (Vercel Cron - ver apps/web/vercel.json, minutely). Avança as
 * ondas cuja janela de confirmação expirou e libera a reserva quando a fila se esgota. A
 * onda 1 NÃO depende daqui (sai síncrona no cancelamento); este cron cuida do "passou 15
 * min sem confirmar → próxima onda" e da expiração dos holds.
 *
 * Protegido por CRON_SECRET (a Vercel manda `Authorization: Bearer <CRON_SECRET>`). Sem o
 * secret configurado, recusa (fail-closed).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { advanced, closed } = await advanceWaitlistWaves(new Date());
  return Response.json({ ok: true, advanced, closed });
}
