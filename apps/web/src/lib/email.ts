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
  return (process.env.APP_URL ?? 'https://www.demandae.com').replace(/\/$/, '');
}

/**
 * Logo Demandaê (PNG transparente hospedado em /public) para o cabeçalho dos e-mails.
 * SVG inline não renderiza em Gmail/Outlook - por isso PNG por <img> com URL absoluta.
 * Depende de APP_URL apontar pro domínio publicado (mesmo requisito dos links de CTA).
 */
export function emailLogo(width = 168): string {
  const height = Math.round((width * 327) / 2271); // proporção do PNG (2271x327)
  return `<img src="${appUrl()}/logo-email.png" width="${width}" height="${height}" alt="Demandaê" style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;" />`;
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
      <div style="margin:0 0 20px">${emailLogo(150)}</div>
      <h2 style="font-size:18px">${title}</h2>
      <p style="font-size:14px;line-height:1.6">${body}</p>
      <p style="margin:24px 0">
        <a href="${link}" style="background:#1a1a1a;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-size:14px">${cta}</a>
      </p>
      <p style="font-size:12px;color:#888">Demandaê - agendamento e atendimento por IA no WhatsApp.</p>
    </div>`;
}

// Identidade visual Demandaê (mesma do e-mail branded de agendamento em appointment-email.ts):
// faixa coral no topo, wordmark, card creme. Fontes da marca com fallback (clientes de
// e-mail não carregam webfonts).
const BRAND_SERIF = "'Fraunces', Georgia, 'Times New Roman', serif";
const BRAND_SANS =
  "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, system-ui, sans-serif";

/**
 * Casca branded dos e-mails do DONO (billing/retenção): card creme, faixa coral, wordmark
 * Demandaê, corpo em HTML livre (aceita <strong>, <br>, listas) e 1 botão de CTA. Table-based
 * + estilos inline pra sobreviver aos clientes de e-mail (Gmail/Outlook). Consistente com o
 * e-mail de agendamento - fecha a identidade visual dos e-mails do produto.
 */
export function brandedShell(title: string, body: string, cta: string, link: string): string {
  return `
  <div style="margin:0;padding:0;background:#faf5ea;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf5ea;">
      <tr><td align="center" style="padding:32px 16px;">
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="width:520px;max-width:100%;background:#ffffff;border:1px solid #ece3d3;border-top:3px solid #ff5a36;border-radius:16px;">
          <tr><td style="padding:28px 36px 0;">
            ${emailLogo()}
          </td></tr>
          <tr><td style="padding:22px 36px 0;">
            <h1 style="margin:0;font-family:${BRAND_SERIF};font-weight:800;font-size:21px;line-height:1.3;color:#0f1f18;">${title}</h1>
          </td></tr>
          <tr><td style="padding:12px 36px 0;">
            <div style="font-family:${BRAND_SANS};font-size:14px;line-height:1.65;color:#27392f;">${body}</div>
          </td></tr>
          <tr><td style="padding:24px 36px 4px;">
            <a href="${link}" style="display:inline-block;background:#ff5a36;color:#ffffff;font-family:${BRAND_SANS};font-size:14px;font-weight:600;text-decoration:none;padding:12px 22px;border-radius:10px;">${cta}</a>
          </td></tr>
          <tr><td style="padding:26px 36px 28px;">
            <div style="border-top:1px solid #ece3d3;padding-top:18px;font-family:${BRAND_SANS};font-size:12px;line-height:1.5;color:#9aa39d;">
              Demanda<span style="color:#ff5a36;">ê</span> · agendamento e atendimento por IA no WhatsApp.
            </div>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </div>`;
}
