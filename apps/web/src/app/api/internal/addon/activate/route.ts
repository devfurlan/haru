import { timingSafeEqual } from 'node:crypto';

import { prisma } from '@haru/database';

import { isSubscriptionActive } from '@haru/billing';

import { effectuateAddonActivation } from '@/lib/billing/addon';
import { emailAddonActivated } from '@/lib/billing/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Endpoint INTERNO: o app admin chama aqui pra ativar o addon "número próprio" depois que o
 * operador conclui a config da WABA na Meta. Fica no web porque só ele tem a chave Asaas da
 * plataforma (o admin não toca a recorrência do Asaas). Autenticado por token compartilhado
 * (ADMIN_INTERNAL_TOKEN), no mesmo espírito do BOT_INTERNAL_TOKEN (ver lib/notify.ts).
 * Ativar = somar o addon à recorrência + cobrar o proporcional + avisar o tenant.
 */
export async function POST(req: Request) {
  const expected = process.env.ADMIN_INTERNAL_TOKEN;
  if (!expected) {
    console.error('[internal/addon] ADMIN_INTERNAL_TOKEN não configurado');
    return Response.json({ error: 'Ativação interna indisponível' }, { status: 503 });
  }
  const received = req.headers.get('x-internal-token') ?? '';
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 });
  }

  let body: { tenantId?: string };
  try {
    body = (await req.json()) as { tenantId?: string };
  } catch {
    return Response.json({ error: 'JSON inválido' }, { status: 400 });
  }
  if (!body.tenantId) {
    return Response.json({ error: 'tenantId obrigatório' }, { status: 400 });
  }

  const sub = await prisma.subscription.findUnique({ where: { tenantId: body.tenantId } });
  if (!sub || sub.addonChannel !== 'OWN' || sub.addonTier == null) {
    return Response.json(
      { error: 'Addon (número próprio) não encontrado para este cliente' },
      { status: 404 },
    );
  }
  if (sub.addonSetupChargedAt == null) {
    return Response.json({ error: 'O setup ainda não foi pago' }, { status: 409 });
  }
  if (sub.addonActivatedAt != null) {
    return Response.json({ ok: true, alreadyActive: true });
  }
  // A assinatura base pode ter caído (PAST_DUE/SUSPENDED) durante os dias de config da WABA.
  // Não ativar (nem cobrar o proporcional) enquanto a base não estiver em dia - senão o addon
  // liga sobre uma assinatura sem acesso. O operador reativa quando o cliente regularizar.
  if (!isSubscriptionActive(sub)) {
    return Response.json(
      { error: 'A assinatura base não está ativa (regularize antes de ativar o addon)' },
      { status: 409 },
    );
  }

  try {
    await effectuateAddonActivation(sub);
  } catch (err) {
    console.error('[internal/addon] ativação falhou', err);
    return Response.json({ error: 'Falha ao ativar o addon' }, { status: 502 });
  }

  emailAddonActivated(body.tenantId, { channel: 'OWN' }).catch((err) =>
    console.error('[internal/addon] email ativação (own) falhou', err),
  );
  return Response.json({ ok: true });
}
