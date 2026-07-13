import { prisma } from '@haru/database';

import { reconcilePendingSubscription } from '@/lib/billing/reconcile';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Fallback do webhook do Asaas (Vercel Cron - ver vercel.json). Reconcilia assinaturas presas
 * em PENDING quando o webhook se perdeu/atrasou: consulta o Asaas e ativa as que já foram
 * pagas. Assim ninguém que pagou fica preso no aviso "aguardando confirmação".
 *
 * Janela: mexidas nos últimos 3 dias (pagamento ainda plausível) e não recentíssimas (dá o
 * tempo do webhook normal chegar primeiro, sem correr com ele). Protegido por CRON_SECRET.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const now = Date.now();
  const pending = await prisma.subscription.findMany({
    where: {
      status: 'PENDING',
      updatedAt: { gte: new Date(now - 3 * 86_400_000), lte: new Date(now - 2 * 60_000) },
    },
    take: 100,
  });

  let activated = 0;
  for (const sub of pending) {
    try {
      if ((await reconcilePendingSubscription(sub)) === 'ACTIVE') activated++;
    } catch (err) {
      console.error('[billing-reconcile] falha p/ assinatura', sub.id, err);
    }
  }

  return Response.json({ ok: true, checked: pending.length, activated });
}
