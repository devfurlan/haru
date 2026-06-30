import 'server-only';

import { prisma } from '@haru/database';

import { appUrl, emailShell, ownerOf, sendEmail } from '@/lib/email';
import { formatPhoneBR } from '@/lib/format';

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

interface CopyCtx {
  name: string | null;
  tenantName: string;
  when: string;
  serviceName: string;
  person?: string;
}

/** Assunto + html do e-mail do CLIENTE por evento. */
function customerEmail(
  event: AppointmentEmailEvent,
  ctx: CopyCtx,
): { subject: string; html: string } {
  const hi = ctx.name ? `Olá, ${ctx.name}!` : 'Olá!';
  const det = detailsBlock(ctx.when, ctx.serviceName);
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

/** Assunto + html do e-mail do DONO por evento. */
function ownerEmail(event: AppointmentEmailEvent, ctx: CopyCtx): { subject: string; html: string } {
  const hi = ctx.name ? `Olá, ${ctx.name}!` : 'Olá!';
  const det = detailsBlock(ctx.when, ctx.serviceName, ctx.person);
  const cta = 'Abrir agenda';
  const link = `${appUrl()}/appointments`;
  switch (event) {
    case 'created':
      return {
        subject: `Novo agendamento - ${ctx.tenantName}`,
        html: emailShell(
          'Novo agendamento (aguardando confirmação)',
          `${hi} Entrou um novo agendamento em <strong>${ctx.tenantName}</strong>, aguardando sua confirmação no painel:${det}`,
          cta,
          link,
        ),
      };
    case 'confirmed':
      return {
        subject: `Novo agendamento - ${ctx.tenantName}`,
        html: emailShell(
          'Novo agendamento',
          `${hi} Entrou um novo agendamento em <strong>${ctx.tenantName}</strong>:${det}`,
          cta,
          link,
        ),
      };
    case 'rescheduled':
      return {
        subject: `Agendamento remarcado - ${ctx.tenantName}`,
        html: emailShell(
          'Agendamento remarcado',
          `${hi} Um cliente remarcou um agendamento em <strong>${ctx.tenantName}</strong>:${det}`,
          cta,
          link,
        ),
      };
    case 'canceled':
      return {
        subject: `Agendamento cancelado - ${ctx.tenantName}`,
        html: emailShell(
          'Agendamento cancelado',
          `${hi} Um cliente cancelou um agendamento em <strong>${ctx.tenantName}</strong>:${det}`,
          cta,
          link,
        ),
      };
  }
}

export async function sendAppointmentEmails(args: SendAppointmentEmailsArgs): Promise<void> {
  const { appointmentId, event, notifyCustomer = true, notifyOwner = true } = args;

  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      startsAt: true,
      service: { select: { name: true } },
      tenant: {
        select: { id: true, name: true, timezone: true, ownerAppointmentEmailsEnabled: true },
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
      });
      await sendEmail(to, subject, html);
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
