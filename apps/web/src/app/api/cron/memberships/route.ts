import { settleExpiringReminders, settleSeriesCredits } from '@/lib/memberships/sweeps';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Cron diário da assinatura de serviços (Vercel Cron - ver vercel.json). Faz DUAS coisas:
 * (1) liquida créditos das ocorrências de série que estão pra acontecer (consumo por
 * ocorrência, na data dela) e (2) avisa "créditos vencendo" pros planos sem rollover.
 * NÃO renova cobrança (isso é nativo do gateway) nem marca inadimplência (webhook-driven).
 * Protegido por CRON_SECRET.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const series = await settleSeriesCredits();
  const expiring = await settleExpiringReminders();
  return Response.json({ series, expiring });
}
