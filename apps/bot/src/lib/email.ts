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
    console.warn('[bot-email] RESEND_API_KEY/BILLING_EMAIL_FROM ausentes - e-mail não enviado');
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
 * Alerta operacional pro OPERADOR da plataforma (env ALERT_EMAIL_TO): a
 * quality_rating do número de um tenant PIOROU na Meta (ex.: GREEN→YELLOW,
 * YELLOW→RED). RED costuma preceder restrição/ban - este é o aviso ANTES do
 * bloqueio. Disparado só na transição (o caller grava o novo rating). Best-effort.
 */
export async function emailQualityDegraded(data: {
  tenantId: string;
  tenantName: string;
  displayPhone: string | null;
  previous: string | null;
  current: string | null;
}): Promise<void> {
  const to = env.ALERT_EMAIL_TO;
  if (!to) return;

  const phone = data.displayPhone ? formatPhoneBR(data.displayPhone) : '(número desconhecido)';
  const de = data.previous ?? 'desconhecida';
  const para = data.current ?? '?';
  const detalhes =
    `<br/><br/><strong>Tenant:</strong> ${data.tenantName} (<code>${data.tenantId}</code>)` +
    `<br/><strong>Número:</strong> ${phone}` +
    `<br/><strong>Qualidade:</strong> ${de} → ${para}`;

  await sendEmail(
    to,
    `⚠️ Qualidade do número caiu para ${para} - ${data.tenantName} (Demandaê)`,
    shell(
      'Qualidade do número em queda',
      `A quality rating do número de <strong>${data.tenantName}</strong> caiu para ` +
        `<code>${para}</code> na Meta. <code>RED</code> costuma preceder restrição/banimento - ` +
        `vale revisar já o volume de envio, a taxa de bloqueios/denúncias e o conteúdo dos ` +
        `templates antes que a Meta limite o número.${detalhes}`,
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

const USAGE_LABEL = { appointments: 'agendamentos', conversations: 'conversas do bot' } as const;

/**
 * Alerta de uso pro DONO: chegou a 85/90/95/100% do teto do ciclo (agendamentos do
 * plano base OU conversas do addon). Tom escala com o nível - 85% é oportunidade sem
 * drama; 95% é urgência; 100% avisa que as CRIAÇÕES do painel pausam (o cliente final
 * segue agendando). Dedup é do caller (uma vez por nível/ciclo). Best-effort.
 */
export async function emailUsageAlert(
  tenantId: string,
  data: {
    metric: 'appointments' | 'conversations';
    level: 85 | 90 | 95 | 100;
    used: number;
    limit: number;
  },
): Promise<void> {
  const o = await ownerOf(tenantId);
  if (!o) return;

  const label = USAGE_LABEL[data.metric];
  const hi = o.name ? `Olá, ${o.name}!` : 'Olá!';
  const pct = Math.round((data.used / data.limit) * 100);
  const uso = `<strong>${data.used}/${data.limit}</strong>`;
  const noNegocio = `em <strong>${o.tenantName}</strong>`;

  let subject: string;
  let title: string;
  let body: string;
  if (data.level >= 100) {
    subject = `Você atingiu o limite de ${label} - Demandaê`;
    title = `Limite de ${label} atingido`;
    body =
      `${hi} Você chegou a ${uso} ${label} neste ciclo ${noNegocio}. ` +
      (data.metric === 'appointments'
        ? `A criação de novos serviços, profissionais e agendamentos manuais fica pausada até o upgrade - mas <strong>seus clientes continuam agendando normalmente</strong>. `
        : `O bot segue atendendo os clientes, mas você já passou do teto de conversas do addon. `) +
      `Faça o upgrade para liberar mais volume.`;
  } else if (data.level >= 95) {
    subject = `⚠️ ${pct}% dos ${label} usados - Demandaê`;
    title = `Você está quase no limite de ${label}`;
    body =
      `${hi} Você já usou <strong>${pct}%</strong> (${uso}) dos ${label} deste ciclo ${noNegocio}. ` +
      `Falta pouco para o teto - ao estourar, as novas criações no painel pausam (seus clientes ` +
      `seguem agendando). Vale fazer o upgrade agora para não interromper o ritmo.`;
  } else if (data.level >= 90) {
    subject = `Você está perto do limite de ${label} - Demandaê`;
    title = `Perto do limite de ${label}`;
    body =
      `${hi} Você já usou <strong>${pct}%</strong> (${uso}) dos ${label} deste ciclo ${noNegocio}. ` +
      `Já vale olhar um plano maior para não correr o risco de travar as criações no fim do ciclo.`;
  } else {
    subject = `Você já usou ${pct}% dos ${label} - Demandaê`;
    title = `${pct}% dos ${label} do seu plano`;
    body =
      `${hi} Você já usou <strong>${pct}%</strong> (${uso}) dos ${label} deste ciclo ${noNegocio}. ` +
      `Está crescendo bem! Se o ritmo continuar, um plano maior evita surpresa no fim do ciclo - ` +
      `dá uma olhada nos planos quando puder, sem pressa.`;
  }

  await sendEmail(o.email, subject, shell(title, body, 'Ver planos', `${appUrl()}/assinatura`));
}

/**
 * Alerta INTERNO pro OPERADOR (env ALERT_EMAIL_TO): um cliente Multi (NEGOCIO) com addon
 * Bot Multi passou do teto de agendamentos ou conversas. Pela política de fair use ele
 * NÃO é bloqueado - o excedente vira conversa de upgrade p/ Enterprise. Disparado uma
 * vez por ciclo (dedup no caller). Best-effort.
 */
export async function emailFairUseExceeded(data: {
  tenantId: string;
  tenantName: string;
  metric: 'appointments' | 'conversations';
  used: number;
  limit: number;
}): Promise<void> {
  const to = env.ALERT_EMAIL_TO;
  if (!to) return;

  const label = USAGE_LABEL[data.metric];
  const detalhes =
    `<br/><br/><strong>Tenant:</strong> ${data.tenantName} (<code>${data.tenantId}</code>)` +
    `<br/><strong>Métrica:</strong> ${label}` +
    `<br/><strong>Uso no ciclo:</strong> ${data.used}/${data.limit} (fair use - sem bloqueio)`;

  await sendEmail(
    to,
    `📈 Fair use estourado - ${data.tenantName} (Demandaê)`,
    shell(
      'Cliente Multi + Bot Multi passou do teto',
      `<strong>${data.tenantName}</strong> (plano Multi com addon Bot Multi) passou do teto de ` +
        `${label} neste ciclo. Pela política de fair use ele NÃO foi bloqueado - é hora de abrir a ` +
        `conversa de upgrade para Enterprise.${detalhes}`,
      'Abrir Demandaê',
      appUrl(),
    ),
  );
}
