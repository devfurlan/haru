import 'server-only';

import { prisma } from '@haru/database';

import { appUrl, emailLogo, emailShell, ownerOf, sendEmail } from '@/lib/email';
import { buildIcs, formatPhoneBR, googleCalendarUrl, type CalendarEvent } from '@haru/shared';

/**
 * E-mails de agendamento (Resend) para o CLIENTE (quem agenda) e para o DONO.
 * Disparados nos eventos de criação/confirmação/remarcação/cancelamento a partir dos
 * cores de mutação e das server actions. Respeitam o opt-out de cada parte:
 *   - cliente: CustomerAccount.appointmentEmailsEnabled (default true);
 *   - dono:    Tenant.ownerAppointmentEmailsEnabled (default true).
 *
 * Best-effort: sempre fire-and-forget no caller; um envio que falha nunca derruba a
 * operação. O lembrete por e-mail (X h antes) vive no loop do bot, não aqui.
 *
 * Espelhado (de propósito) em apps/bot/src/lib/appointmentEmail.ts - o bot tem
 * infraestrutura própria e não importa o web. Se evoluir, extrair p/ @haru/notifications.
 */

export type AppointmentEmailEvent = 'created' | 'confirmed' | 'rescheduled' | 'canceled';

interface SendAppointmentEmailsArgs {
  appointmentId: string;
  event: AppointmentEmailEvent;
  /** Avisar o cliente (quem agenda). Default true. */
  notifyCustomer?: boolean;
  /**
   * Avisar o dono. Default true. Eventos por iniciativa do próprio dono (criação
   * manual, confirmação ou cancelamento/remarcação pelo painel) passam false.
   */
  notifyOwner?: boolean;
}

function formatWhen(date: Date, tz: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: tz,
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/** Bloco de detalhes (data/hora · serviço · [pessoa]) reutilizado nos dois lados. */
function detailsBlock(when: string, serviceName: string, person?: string): string {
  return `<br/><br/>📅 ${when}<br/>✂️ ${serviceName}` + (person ? `<br/>👤 ${person}` : '');
}

/** Botão "Adicionar à agenda" (Google Agenda) - injetado no corpo dos e-mails do cliente. */
function calendarButton(url: string): string {
  return `<br/><br/><a href="${url}" style="display:inline-block;background:#0f1f18;color:#fff;text-decoration:none;font-size:14px;padding:10px 18px;border-radius:8px">🗓️ Adicionar à agenda</a>`;
}

interface CopyCtx {
  name: string | null;
  tenantName: string;
  when: string;
  serviceName: string;
  person?: string;
  /** Presente em criado/confirmado/remarcado: renderiza o botão "Adicionar à agenda". */
  calendarUrl?: string;
}

/** Assunto + html do e-mail do CLIENTE por evento. */
function customerEmail(
  event: AppointmentEmailEvent,
  ctx: CopyCtx,
): { subject: string; html: string } {
  const hi = ctx.name ? `Olá, ${ctx.name}!` : 'Olá!';
  const det = detailsBlock(ctx.when, ctx.serviceName) + (ctx.calendarUrl ? calendarButton(ctx.calendarUrl) : '');
  const cta = 'Ver meus agendamentos';
  const link = `${appUrl()}/conta/agendamentos`;
  switch (event) {
    case 'created':
      return {
        subject: `Recebemos seu agendamento - ${ctx.tenantName}`,
        html: emailShell(
          'Agendamento recebido',
          `${hi} Recebemos seu agendamento em <strong>${ctx.tenantName}</strong>. Ele está aguardando a confirmação do estabelecimento.${det}`,
          cta,
          link,
        ),
      };
    case 'confirmed':
      return {
        subject: `Agendamento confirmado - ${ctx.tenantName}`,
        html: emailShell(
          'Agendamento confirmado',
          `${hi} Seu agendamento em <strong>${ctx.tenantName}</strong> está confirmado.${det}`,
          cta,
          link,
        ),
      };
    case 'rescheduled':
      return {
        subject: `Seu agendamento foi remarcado - ${ctx.tenantName}`,
        html: emailShell(
          'Agendamento remarcado',
          `${hi} Seu agendamento em <strong>${ctx.tenantName}</strong> foi remarcado para:${det}`,
          cta,
          link,
        ),
      };
    case 'canceled':
      return {
        subject: `Seu agendamento foi cancelado - ${ctx.tenantName}`,
        html: emailShell(
          'Agendamento cancelado',
          `${hi} Seu agendamento em <strong>${ctx.tenantName}</strong> foi cancelado.${det}`,
          cta,
          link,
        ),
      };
  }
}

// Identidade visual Demandaê (cores da marca) usada no template do DONO.
const SERIF = "'Fraunces', Georgia, 'Times New Roman', serif";
const SANS =
  "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, system-ui, sans-serif";

/**
 * Template Demandaê-branded (estilo "Linear": card branco, faixa coral no topo,
 * wordmark, painel de detalhes estruturado) usado nos e-mails do DONO - é o usuário
 * que usa o Demandaê, então o e-mail leva a marca. Tudo inline + table-based pra
 * sobreviver aos clientes de e-mail (Gmail/Outlook).
 */
function brandedOwnerEmail(args: {
  title: string;
  intro: string;
  rows: { label: string; value: string }[];
  ctaLabel: string;
  ctaLink: string;
}): string {
  const rowsHtml = args.rows
    .map(
      (r, i) => `
              <tr><td style="padding-top:${i === 0 ? '0' : '14px'};font-family:${SANS};font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#8a958f;">${r.label}</td></tr>
              <tr><td style="padding-top:3px;font-family:${SANS};font-size:15px;font-weight:600;color:#0f1f18;">${r.value}</td></tr>`,
    )
    .join('');

  return `
  <div style="margin:0;padding:0;background:#faf5ea;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf5ea;">
      <tr><td align="center" style="padding:32px 16px;">
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="width:520px;max-width:100%;background:#ffffff;border:1px solid #ece3d3;border-top:3px solid #ff5a36;border-radius:16px;">
          <tr><td style="padding:28px 36px 0;">
            ${emailLogo()}
          </td></tr>
          <tr><td style="padding:22px 36px 0;">
            <h1 style="margin:0;font-family:${SERIF};font-weight:800;font-size:21px;line-height:1.3;color:#0f1f18;">${args.title}</h1>
          </td></tr>
          <tr><td style="padding:10px 36px 0;">
            <p style="margin:0;font-family:${SANS};font-size:14px;line-height:1.65;color:#27392f;">${args.intro}</p>
          </td></tr>
          <tr><td style="padding:20px 36px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fbf8f1;border:1px solid #ece3d3;border-radius:12px;">
              <tr><td style="padding:18px 20px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rowsHtml}
                </table>
              </td></tr>
            </table>
          </td></tr>
          <tr><td style="padding:24px 36px 4px;">
            <a href="${args.ctaLink}" style="display:inline-block;background:#ff5a36;color:#ffffff;font-family:${SANS};font-size:14px;font-weight:600;text-decoration:none;padding:12px 22px;border-radius:10px;">${args.ctaLabel}</a>
          </td></tr>
          <tr><td style="padding:26px 36px 28px;">
            <div style="border-top:1px solid #ece3d3;padding-top:18px;font-family:${SANS};font-size:12px;line-height:1.5;color:#9aa39d;">
              Demanda<span style="color:#ff5a36;">ê</span> · agendamento e atendimento por IA no WhatsApp.
            </div>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </div>`;
}

/** Assunto + html do e-mail do DONO por evento (template branded Demandaê). */
function ownerEmail(event: AppointmentEmailEvent, ctx: CopyCtx): { subject: string; html: string } {
  const hi = ctx.name ? `Olá, ${ctx.name}!` : 'Olá!';
  const rows = [
    { label: 'Data e hora', value: ctx.when },
    { label: 'Serviço', value: ctx.serviceName },
    { label: 'Cliente', value: ctx.person ?? '-' },
  ];
  const ctaLabel = 'Abrir agenda';
  const ctaLink = `${appUrl()}/appointments`;
  switch (event) {
    case 'created':
      return {
        subject: `Novo agendamento - ${ctx.tenantName}`,
        html: brandedOwnerEmail({
          title: 'Novo agendamento',
          intro: `${hi} Entrou um novo agendamento em <strong>${ctx.tenantName}</strong>, aguardando sua confirmação no painel.`,
          rows,
          ctaLabel,
          ctaLink,
        }),
      };
    case 'confirmed':
      return {
        subject: `Novo agendamento - ${ctx.tenantName}`,
        html: brandedOwnerEmail({
          title: 'Novo agendamento',
          intro: `${hi} Entrou um novo agendamento em <strong>${ctx.tenantName}</strong>.`,
          rows,
          ctaLabel,
          ctaLink,
        }),
      };
    case 'rescheduled':
      return {
        subject: `Agendamento remarcado - ${ctx.tenantName}`,
        html: brandedOwnerEmail({
          title: 'Agendamento remarcado',
          intro: `${hi} Um cliente remarcou um agendamento em <strong>${ctx.tenantName}</strong>.`,
          rows,
          ctaLabel,
          ctaLink,
        }),
      };
    case 'canceled':
      return {
        subject: `Agendamento cancelado - ${ctx.tenantName}`,
        html: brandedOwnerEmail({
          title: 'Agendamento cancelado',
          intro: `${hi} Um cliente cancelou um agendamento em <strong>${ctx.tenantName}</strong>.`,
          rows,
          ctaLabel,
          ctaLink,
        }),
      };
  }
}

export async function sendAppointmentEmails(args: SendAppointmentEmailsArgs): Promise<void> {
  const { appointmentId, event, notifyCustomer = true, notifyOwner = true } = args;

  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      startsAt: true,
      service: { select: { name: true, durationMinutes: true } },
      tenant: {
        select: {
          id: true,
          name: true,
          timezone: true,
          address: true,
          ownerAppointmentEmailsEnabled: true,
        },
      },
      contact: {
        select: {
          name: true,
          email: true,
          phone: true,
          customerAccount: {
            select: { email: true, name: true, appointmentEmailsEnabled: true },
          },
        },
      },
    },
  });
  if (!appt) return;

  const tenantName = appt.tenant.name;
  const when = formatWhen(appt.startsAt, appt.tenant.timezone);
  const serviceName = appt.service.name;

  // "Adicionar à agenda" em tudo menos cancelamento: mesmo evento vira botão (Google)
  // e anexo .ics (add-to-calendar nativo em Apple/Gmail/Outlook).
  const calEvent: CalendarEvent | null =
    event === 'canceled'
      ? null
      : {
          title: `${serviceName} · ${tenantName}`,
          startIso: appt.startsAt.toISOString(),
          minutes: appt.service.durationMinutes,
          location: appt.tenant.address ?? undefined,
        };
  const icsAttachment = calEvent
    ? [
        {
          filename: 'agendamento.ics',
          content: Buffer.from(
            buildIcs({ ...calEvent, uid: `${appointmentId}@demandae` }),
            'utf8',
          ).toString('base64'),
          contentType: 'text/calendar',
        },
      ]
    : undefined;

  // --- Cliente: e-mail vem da conta (sempre tem) com fallback ao Contact.email ---
  if (notifyCustomer) {
    const account = appt.contact.customerAccount;
    const to = account?.email ?? appt.contact.email;
    const prefOn = account?.appointmentEmailsEnabled ?? true;
    if (to && prefOn) {
      const { subject, html } = customerEmail(event, {
        name: account?.name ?? appt.contact.name ?? null,
        tenantName,
        when,
        serviceName,
        calendarUrl: calEvent ? googleCalendarUrl(calEvent) : undefined,
      });
      await sendEmail(to, subject, html, icsAttachment);
    }
  }

  // --- Dono ---
  if (notifyOwner && appt.tenant.ownerAppointmentEmailsEnabled) {
    const owner = await ownerOf(appt.tenant.id);
    if (owner) {
      const person = appt.contact.name?.trim() || formatPhoneBR(appt.contact.phone);
      const { subject, html } = ownerEmail(event, {
        name: owner.name,
        tenantName,
        when,
        serviceName,
        person,
      });
      await sendEmail(owner.email, subject, html);
    }
  }
}
