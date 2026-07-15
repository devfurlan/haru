import { prisma } from '@haru/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Cron diário de fechamento de presença (Vercel Cron - ver apps/web/vercel.json). Fecha
 * como COMPLETED todo agendamento que já TERMINOU e ficou parado em PENDING/CONFIRMED.
 * `attendanceConfirmed` fica false (foi o sistema, não o dono). NUNCA marca NO_SHOW - falta
 * só o dono aponta, pelo card de fechamento do dia ou pelos botões de correção.
 *
 * ponytail: sem loop por tenant/fuso. Gatear em `endsAt < now` (dois instantes UTC) já
 * garante "só fecha o que de fato terminou" em qualquer fuso - o horário do cron só decide
 * a promptidão, não a correção. Idempotente (a 2ª rodada não reencontra PENDING/CONFIRMED
 * no passado). Se a promptidão em fusos distantes importar, rodar de hora em hora.
 *
 * Protegido por CRON_SECRET (fail-closed sem o secret).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const result = await prisma.appointment.updateMany({
    where: { endsAt: { lt: new Date() }, status: { in: ['PENDING', 'CONFIRMED'] } },
    data: { status: 'COMPLETED' },
  });

  return Response.json({ ok: true, closed: result.count });
}
