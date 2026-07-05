import 'server-only';

import { prisma } from '@haru/database';

/**
 * Primitivo de e-mail transacional via Resend (REST, sem SDK), compartilhado pelos
 * e-mails do web (billing, agendamento). Best-effort - nunca derruba a operação; se
 * as envs não estiverem setadas, vira no-op logado.
 * Requer: RESEND_API_KEY, BILLING_EMAIL_FROM (ex.: "Demandaê <cobranca@demandae.app>").
 */

const RESEND_URL = 'https://api.resend.com/emails';

export function appUrl(): string {
  return (process.env.APP_URL ?? 'https://demandae.app').replace(/\/$/, '');
}

/** Anexo Resend: `content` em base64. Ex.: convite .ics de "adicionar à agenda". */
export type EmailAttachment = { filename: string; content: string; contentType?: string };

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  attachments?: EmailAttachment[],
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.BILLING_EMAIL_FROM;
  if (!apiKey || !from) {
    console.warn('[email] RESEND_API_KEY/BILLING_EMAIL_FROM ausentes - e-mail não enviado');
    return false;
  }
  try {
    const body: Record<string, unknown> = { from, to, subject, html };
    if (attachments?.length) {
      body.attachments = attachments.map((a) => ({
        filename: a.filename,
        content: a.content,
        ...(a.contentType ? { content_type: a.contentType } : {}),
      }));
    }
    const res = await fetch(RESEND_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error('[email] resend', res.status, await res.text().catch(() => ''));
      return false;
    }
    return true;
  } catch (err) {
    console.error('[email] falhou', err);
    return false;
  }
}

/** Resolve o dono (OWNER) do tenant + nome do negócio para destinatário do e-mail. */
export async function ownerOf(
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

/** Casca HTML padrão dos e-mails (título + corpo + 1 botão de CTA). */
export function emailShell(title: string, body: string, cta: string, link: string): string {
  return `
    <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">
      <h2 style="font-size:18px">${title}</h2>
      <p style="font-size:14px;line-height:1.6">${body}</p>
      <p style="margin:24px 0">
        <a href="${link}" style="background:#1a1a1a;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-size:14px">${cta}</a>
      </p>
      <p style="font-size:12px;color:#888">Demandaê - agendamento e atendimento por IA no WhatsApp.</p>
    </div>`;
}
