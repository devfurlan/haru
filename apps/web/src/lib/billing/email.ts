import 'server-only';

import { prisma } from '@haru/database';

/**
 * E-mails transacionais de billing via Resend (REST, sem SDK). Avisos pro DONO do
 * tenant: falha de pagamento, ativação e suspensão da assinatura. Best-effort -
 * nunca derruba o webhook; se as envs não estiverem setadas, vira no-op logado.
 * Requer: RESEND_API_KEY, BILLING_EMAIL_FROM (ex.: "Demandaê <cobranca@demandae.app>").
 */

const RESEND_URL = 'https://api.resend.com/emails';

function appUrl(): string {
  return (process.env.APP_URL ?? 'https://demandae.app').replace(/\/$/, '');
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.BILLING_EMAIL_FROM;
  if (!apiKey || !from) {
    console.warn('[billing-email] RESEND_API_KEY/BILLING_EMAIL_FROM ausentes — e-mail não enviado');
    return false;
  }
  try {
    const res = await fetch(RESEND_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) {
      console.error('[billing-email] resend', res.status, await res.text().catch(() => ''));
      return false;
    }
    return true;
  } catch (err) {
    console.error('[billing-email] falhou', err);
    return false;
  }
}

/** Resolve o dono (OWNER) do tenant + nome do negócio para destinatário do e-mail. */
async function ownerOf(
  tenantId: string,
): Promise<{ email: string; name: string | null; tenantName: string } | null> {
  const [tenant, owner] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
    prisma.user.findFirst({
      where: { tenantId, role: 'OWNER' },
      select: { email: true, name: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);
  if (!tenant || !owner?.email) return null;
  return { email: owner.email, name: owner.name, tenantName: tenant.name };
}

function shell(title: string, body: string, cta: string): string {
  const link = `${appUrl()}/assinatura`;
  return `
    <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">
      <h2 style="font-size:18px">${title}</h2>
      <p style="font-size:14px;line-height:1.6">${body}</p>
      <p style="margin:24px 0">
        <a href="${link}" style="background:#1a1a1a;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-size:14px">${cta}</a>
      </p>
      <p style="font-size:12px;color:#888">Demandaê — agendamento e atendimento por IA no WhatsApp.</p>
    </div>`;
}

/** Pagamento da assinatura falhou — acesso pausado (sem carência). */
export async function emailPaymentFailed(tenantId: string): Promise<void> {
  const o = await ownerOf(tenantId);
  if (!o) return;
  const hi = o.name ? `Olá, ${o.name}!` : 'Olá!';
  await sendEmail(
    o.email,
    'Falha no pagamento da sua assinatura — Demandaê',
    shell(
      'Não conseguimos confirmar seu pagamento',
      `${hi} O pagamento da assinatura de <strong>${o.tenantName}</strong> não foi confirmado e o acesso ` +
        `foi pausado. Regularize para reativar o bot e o painel — leva menos de um minuto.`,
      'Regularizar pagamento',
    ),
  );
}

/** Assinatura ativada/reativada após confirmação do pagamento. */
export async function emailSubscriptionActivated(tenantId: string): Promise<void> {
  const o = await ownerOf(tenantId);
  if (!o) return;
  const hi = o.name ? `Olá, ${o.name}!` : 'Olá!';
  await sendEmail(
    o.email,
    'Assinatura ativada 🎉 — Demandaê',
    shell(
      'Tudo certo, sua assinatura está ativa!',
      `${hi} O pagamento de <strong>${o.tenantName}</strong> foi confirmado. Já pode usar tudo do seu plano.`,
      'Ir para o painel',
    ),
  );
}

/** Recibo de uma renovação paga (a cada ciclo cobrado com sucesso). */
export async function emailPaymentReceipt(tenantId: string, amountCents: number | null): Promise<void> {
  const o = await ownerOf(tenantId);
  if (!o) return;
  const hi = o.name ? `Olá, ${o.name}!` : 'Olá!';
  const valor =
    amountCents != null
      ? ` de ${(amountCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
      : '';
  await sendEmail(
    o.email,
    'Recibo da sua assinatura — Demandaê',
    shell(
      'Pagamento recebido',
      `${hi} Recebemos o pagamento${valor} da assinatura de <strong>${o.tenantName}</strong>. ` +
        `Sua assinatura segue ativa — obrigado!`,
      'Ver assinatura',
    ),
  );
}

/** Assinatura suspensa (cancelamento/estorno/chargeback). */
export async function emailSubscriptionSuspended(tenantId: string): Promise<void> {
  const o = await ownerOf(tenantId);
  if (!o) return;
  const hi = o.name ? `Olá, ${o.name}!` : 'Olá!';
  await sendEmail(
    o.email,
    'Sua assinatura foi suspensa — Demandaê',
    shell(
      'Assinatura suspensa',
      `${hi} A assinatura de <strong>${o.tenantName}</strong> foi suspensa e o acesso está bloqueado. ` +
        `Você pode reativar a qualquer momento.`,
      'Reativar assinatura',
    ),
  );
}
