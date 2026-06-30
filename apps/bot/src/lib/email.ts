import { env } from './env.js';
import { Sentry } from '../instrument.js';
import { formatPhoneBR } from './format.js';
import prisma from './prisma.js';

/**
 * E-mails transacionais do bot via Resend (REST, sem SDK). Por enquanto: aviso pro
 * DONO do tenant quando um cliente pede atendimento humano (handoff). Best-effort -
 * nunca derruba o processamento da mensagem; se as envs não estiverem setadas, vira
 * no-op logado. Requer: RESEND_API_KEY, BILLING_EMAIL_FROM
 * (ex.: "Demandaê <cobranca@demandae.app>").
 */

const RESEND_URL = 'https://api.resend.com/emails';

export function appUrl(): string {
  return (process.env.APP_URL ?? 'https://demandae.app').replace(/\/$/, '');
}

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.BILLING_EMAIL_FROM;
  if (!apiKey || !from) {
    console.warn('[bot-email] RESEND_API_KEY/BILLING_EMAIL_FROM ausentes - e-mail não enviado');
    return false;
  }
  try {
    const res = await fetch(RESEND_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) {
      console.error('[bot-email] resend', res.status, await res.text().catch(() => ''));
      return false;
    }
    return true;
  } catch (err) {
    console.error('[bot-email] falhou', err);
    Sentry.captureException(err);
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

export function shell(title: string, body: string, cta: string, link: string): string {
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

/**
 * Alerta operacional pro OPERADOR da plataforma (env ALERT_EMAIL_TO, não o dono do
 * tenant): o número de WhatsApp de um tenant foi detectado como BANIDO pela Meta.
 * Disparado uma única vez por banimento (o caller grava tenant.whatsappBannedAt).
 * Best-effort.
 */
export async function emailNumberBanned(data: {
  tenantId: string;
  tenantName: string;
  displayPhone: string | null;
  status: string | null;
  nameStatus: string | null;
}): Promise<void> {
  const to = env.ALERT_EMAIL_TO;
  if (!to) return;

  const phone = data.displayPhone ? formatPhoneBR(data.displayPhone) : '(número desconhecido)';
  const detalhes =
    `<br/><br/><strong>Tenant:</strong> ${data.tenantName} (<code>${data.tenantId}</code>)` +
    `<br/><strong>Número:</strong> ${phone}` +
    `<br/><strong>status:</strong> ${data.status ?? '?'}` +
    `<br/><strong>name_status:</strong> ${data.nameStatus ?? '?'}`;

  await sendEmail(
    to,
    `⚠️ Número banido pela Meta - ${data.tenantName} (Demandaê)`,
    shell(
      'Número de WhatsApp banido',
      `O número do tenant <strong>${data.tenantName}</strong> está com <code>status=BANNED</code> ` +
        `na Meta - todo envio (lembrete, resposta do bot, confirmação) é recusado com o erro ` +
        `genérico #135000. O loop de lembretes vai pular esse tenant até o número ser reabilitado. ` +
        `Resolva pelo WhatsApp Manager (Qualidade da conta → solicitar revisão).${detalhes}`,
      'Abrir WhatsApp Manager',
      'https://business.facebook.com/wa/manage/phone-numbers/',
    ),
  );
}

/**
 * Avisa o dono que um cliente pediu pra falar com um humano. Respeita o opt-out
 * `tenant.handoffEmailEnabled` (default true). Best-effort.
 */
export async function emailHandoffRequested(
  tenantId: string,
  data: { contactName: string | null; contactPhone: string; reason?: string | null },
): Promise<void> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { handoffEmailEnabled: true },
  });
  if (!tenant || tenant.handoffEmailEnabled === false) return;

  const o = await ownerOf(tenantId);
  if (!o) return;

  const hi = o.name ? `Olá, ${o.name}!` : 'Olá!';
  const cliente = data.contactName?.trim() || 'Um cliente';
  const phone = formatPhoneBR(data.contactPhone);
  const motivo = data.reason?.trim()
    ? `<br/><br/>Motivo informado: <em>${data.reason.trim()}</em>`
    : '';
  await sendEmail(
    o.email,
    `${cliente} pediu atendimento humano - Demandaê`,
    shell(
      'Um cliente quer falar com você',
      `${hi} <strong>${cliente}</strong> (${phone}) pediu pra falar com uma pessoa no WhatsApp de ` +
        `<strong>${o.tenantName}</strong>. O bot ficou em silêncio nessa conversa - responda pelo painel.${motivo}`,
      'Abrir conversas',
      `${appUrl()}/conversations`,
    ),
  );
}
