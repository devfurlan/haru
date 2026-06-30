import { appUrl, ownerOf, sendEmail, shell } from './email.js';
import { formatPhoneBR } from './format.js';
import prisma from './prisma.js';

/**
 * E-mails de agendamento (Resend) disparados pelo BOT - espelho de
 * apps/web/src/lib/appointment-email.ts (o bot tem infraestrutura própria e não
 * importa o web). Cobre:
 *   - eventos do bot (criar/cancelar/remarcar via WhatsApp) -> sendAppointmentEmails;
 *   - lembrete por e-mail ao cliente (X h antes), chamado pelo loop de reminders.
 *
 * Respeitam o opt-out de cada parte (CustomerAccount.appointmentEmailsEnabled e
 * Tenant.ownerAppointmentEmailsEnabled). Best-effort - nunca derrubam o processamento.
 */

export type AppointmentEmailEvent = 'created' | 'confirmed' | 'rescheduled' | 'canceled';

interface SendAppointmentEmailsArgs {
  appointmentId: string;
  event: AppointmentEmailEvent;
  notifyCustomer?: boolean;
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
        html: shell(
          'Agendamento recebido',
          `${hi} Recebemos seu agendamento em <strong>${ctx.tenantName}</strong>. Ele está aguardando a confirmação do estabelecimento.${det}`,
          cta,
          link,
        ),
      };
    case 'confirmed':
      return {
        subject: `Agendamento confirmado - ${ctx.tenantName}`,
        html: shell(
          'Agendamento confirmado',
          `${hi} Seu agendamento em <strong>${ctx.tenantName}</strong> está confirmado.${det}`,
          cta,
          link,
        ),
      };
    case 'rescheduled':
      return {
        subject: `Seu agendamento foi remarcado - ${ctx.tenantName}`,
        html: shell(
          'Agendamento remarcado',
          `${hi} Seu agendamento em <strong>${ctx.tenantName}</strong> foi remarcado para:${det}`,
          cta,
          link,
        ),
      };
    case 'canceled':
      return {
        subject: `Seu agendamento foi cancelado - ${ctx.tenantName}`,
        html: shell(
          'Agendamento cancelado',
          `${hi} Seu agendamento em <strong>${ctx.tenantName}</strong> foi cancelado.${det}`,
          cta,
          link,
        ),
      };
  }
}

function ownerEmail(event: AppointmentEmailEvent, ctx: CopyCtx): { subject: string; html: string } {
  const hi = ctx.name ? `Olá, ${ctx.name}!` : 'Olá!';
  const det = detailsBlock(ctx.when, ctx.serviceName, ctx.person);
  const cta = 'Abrir agenda';
  const link = `${appUrl()}/appointments`;
  switch (event) {
    case 'created':
      return {
        subject: `Novo agendamento - ${ctx.tenantName}`,
        html: shell(
          'Novo agendamento (aguardando confirmação)',
          `${hi} Entrou um novo agendamento em <strong>${ctx.tenantName}</strong>, aguardando sua confirmação no painel:${det}`,
          cta,
          link,
        ),
      };
    case 'confirmed':
      return {
        subject: `Novo agendamento - ${ctx.tenantName}`,
        html: shell(
          'Novo agendamento',
          `${hi} Entrou um novo agendamento em <strong>${ctx.tenantName}</strong>:${det}`,
          cta,
          link,
        ),
      };
    case 'rescheduled':
      return {
        subject: `Agendamento remarcado - ${ctx.tenantName}`,
        html: shell(
          'Agendamento remarcado',
          `${hi} Um cliente remarcou um agendamento em <strong>${ctx.tenantName}</strong>:${det}`,
          cta,
          link,
        ),
      };
    case 'canceled':
      return {
        subject: `Agendamento cancelado - ${ctx.tenantName}`,
        html: shell(
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

/**
 * Lembrete por e-mail AO CLIENTE (X h antes), chamado pelo loop de reminders. O dono
 * NÃO recebe lembrete por agendamento (decisão de produto - evita flood). O caller já
 * resolveu destinatário/preferência/quando a partir do appointment carregado no loop.
 */
export async function emailAppointmentReminder(data: {
  to: string;
  customerName: string | null;
  tenantName: string;
  when: string;
  serviceName: string;
}): Promise<void> {
  const hi = data.customerName ? `Olá, ${data.customerName}!` : 'Olá!';
  const det = detailsBlock(data.when, data.serviceName);
  await sendEmail(
    data.to,
    `Lembrete do seu agendamento - ${data.tenantName}`,
    shell(
      'Lembrete de agendamento',
      `${hi} Passando pra lembrar do seu agendamento em <strong>${data.tenantName}</strong>:${det}`,
      'Ver meus agendamentos',
      `${appUrl()}/conta/agendamentos`,
    ),
  );
}
