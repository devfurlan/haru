import { prisma } from '@haru/database';

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

  const now = new Date();
  const { advanced, closed } = await advanceWaitlistWaves(now);

  // Limpeza: inscrição WAITING de dia que já passou nunca vai ser atendida. Cancela em
  // silêncio (sem aviso ao cliente) pra não inflar contagens nem acumular lixo.
  // ponytail: corte global = ontem em UTC (folga de 1 dia cobre qualquer fuso do tenant sem
  // olhar Tenant.timezone); se precisar limpar no minuto em que o dia vira, cortar por fuso.
  const cutoff = new Date(`${now.toISOString().slice(0, 10)}T00:00:00.000Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - 1);
  const { count: expired } = await prisma.waitlistEntry.updateMany({
    where: { status: 'WAITING', date: { lt: cutoff } },
    data: { status: 'CANCELED' },
  });

  return Response.json({ ok: true, advanced, closed, expired });
}
