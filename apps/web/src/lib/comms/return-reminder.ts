import 'server-only';

import * as Sentry from '@sentry/nextjs';

import { prisma } from '@haru/database';
import { weekdayInTz } from '@haru/shared';

import { appUrl } from '@/lib/email';
import { isVisit, type ApptStatus } from '@/lib/lapsed-clients';
import { nextSlotsForProfessional } from '@/lib/professionals';

import {
  ATTRIBUTION_DAYS,
  LAPSE_DAYS,
  LEAD_DAYS,
  MIN_GAP_DAYS,
  SLOT_HORIZON_DAYS,
  SLOT_LIMIT,
  returnCandidates,
  returnReminderCopy,
  type ReturnApptInput,
  type ReturnCandidate,
} from './return-reminder-core';
import {
  channelDecision,
  notifyPreferOwnChannels,
  type OwnChannelTarget,
} from './prefer-own-channels';

/**
 * Lembrete de retorno PREVENTIVO: cutuca o cliente pra reagendar quando chega a hora do
 * próximo atendimento (antes de virar "sumido"). Disparado pelo cron diário
 * /api/cron/return-reminders. Vale em TODOS os planos (retenção, não capa).
 *
 * Recorte (no where): sem agendamento futuro, sem assinatura ativa do Clube (já recebe
 * comms de crédito), respeitando o opt-out por-tipo do cliente logado e o min-gap por
 * contato. A engine pura (return-reminder-core.ts) decide o ciclo por (cliente+serviço)
 * pela mediana do histórico (ou returnCycleDays do serviço). Canais own-first
 * (prefer-own-channels.ts): push+email juntos, WhatsApp só se não houver canal próprio.
 * Dedup atômico: cria a linha ReturnReminder (unique contactId+serviceId+cycleAnchor)
 * ANTES de enviar; P2002 = já enviado neste ciclo.
 */

const DAY_MS = 86_400_000;
const WEEKDAY_ABBR = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/** "15:00" -> "15h"; "15:30" -> "15h30". */
function hourLabel(hhmm: string): string {
  const [h, m] = hhmm.split(':');
  return m === '00' ? `${h}h` : `${h}h${m}`;
}

type ApptRow = {
  serviceId: string;
  startsAt: Date;
  status: ApptStatus;
  service: {
    name: string;
    priceCents: number;
    durationMinutes: number;
    returnCycleDays: number | null;
  };
  professional: { id: string; name: string | null };
};

/** Profissional habitual do cliente NAQUELE serviço: o mais frequente, desempate = mais recente. */
function preferredPro(
  appts: ApptRow[],
  serviceId: string,
  nowMs: number,
): { id: string; name: string | null } {
  const stats = new Map<string, { count: number; lastMs: number; name: string | null }>();
  for (const a of appts) {
    if (a.serviceId !== serviceId || !isVisit(a, nowMs)) continue;
    const cur = stats.get(a.professional.id) ?? { count: 0, lastMs: 0, name: a.professional.name };
    cur.count += 1;
    cur.lastMs = Math.max(cur.lastMs, a.startsAt.getTime());
    stats.set(a.professional.id, cur);
  }
  let bestId = '';
  let best = { count: -1, lastMs: -1 };
  for (const [id, s] of stats) {
    if (s.count > best.count || (s.count === best.count && s.lastMs > best.lastMs)) {
      bestId = id;
      best = s;
    }
  }
  const s = stats.get(bestId);
  return { id: bestId, name: s?.name ?? null };
}

/** Escolhe 1 candidato do contato: o mais urgente (menor daysUntil), desempate por receita. */
function pickCandidate(appts: ApptRow[], now: Date, tz: string): ReturnCandidate | null {
  const inputs: ReturnApptInput[] = appts.map((a) => ({
    serviceId: a.serviceId,
    startsAt: a.startsAt,
    status: a.status,
    priceCents: a.service.priceCents,
  }));
  const cycleCfg = new Map<string, number | null>();
  for (const a of appts) cycleCfg.set(a.serviceId, a.service.returnCycleDays);

  const cands = returnCandidates(inputs, cycleCfg, now, {
    leadDays: LEAD_DAYS,
    lapseDays: LAPSE_DAYS,
    tz,
  });
  if (cands.length === 0) return null;
  cands.sort((a, b) => a.daysUntil - b.daysUntil || b.priceCents - a.priceCents);
  return cands[0];
}

/** Dispara os lembretes de um tenant. Erro por contato é engolido (um não para a fila). */
async function dispatchForTenant(
  tenant: { id: string; name: string; slug: string; timezone: string },
  now: Date,
): Promise<{ checked: number; sent: number }> {
  const minGapSince = new Date(now.getTime() - MIN_GAP_DAYS * DAY_MS);

  const contacts = await prisma.contact.findMany({
    where: {
      tenantId: tenant.id,
      // Cliente logado precisa ter o tipo ligado; walk-in (sem conta) entra pelo WhatsApp.
      OR: [
        { customerAccountId: null },
        { customerAccount: { is: { returnRemindersEnabled: true } } },
      ],
      // Sem agendamento futuro (não cutucar quem já vai voltar).
      appointments: { none: { startsAt: { gte: now }, status: { notIn: ['CANCELED'] } } },
      // Assinante ativo do Clube já recebe comms de crédito - fora daqui.
      memberships: { none: { status: 'ACTIVE' } },
      // Anti-spam POR CONTATO: nenhum lembrete de retorno nos últimos MIN_GAP_DAYS.
      returnReminders: { none: { sentAt: { gte: minGapSince } } },
    },
    select: {
      id: true,
      name: true,
      phone: true,
      remindersOptOutAt: true,
      appointments: {
        select: {
          serviceId: true,
          startsAt: true,
          status: true,
          service: {
            select: { name: true, priceCents: true, durationMinutes: true, returnCycleDays: true },
          },
          professional: { select: { id: true, name: true } },
        },
      },
      customerAccount: {
        select: {
          name: true,
          email: true,
          phone: true,
          pushDevices: { select: { expoPushToken: true } },
        },
      },
    },
  });

  const nowMs = now.getTime();
  let sent = 0;

  for (const contact of contacts) {
    try {
      const appts = contact.appointments as ApptRow[];
      const cand = pickCandidate(appts, now, tenant.timezone);
      if (!cand) continue;

      const acc = contact.customerAccount;
      const target: OwnChannelTarget = {
        email: acc?.email ?? null,
        phone: acc?.phone ?? contact.phone, // walk-in usa o telefone do Contact
        pushDevices: acc?.pushDevices ?? [],
      };
      const whatsappOptOut = contact.remindersOptOutAt != null;
      // Sem nenhum canal alcançável: não queima o ciclo (re-tenta se abrir um canal depois).
      const reachable =
        target.pushDevices.length > 0 || !!target.email || (!!target.phone && !whatsappOptOut);
      if (!reachable) continue;

      const svc = appts.find((a) => a.serviceId === cand.serviceId)!.service;
      const pro = preferredPro(appts, cand.serviceId, nowMs);

      const slots = await nextSlotsForProfessional({
        tenantId: tenant.id,
        serviceId: cand.serviceId,
        professionalId: pro.id,
        tz: tenant.timezone,
        durationMinutes: svc.durationMinutes,
        now,
        horizonDays: SLOT_HORIZON_DAYS,
        limit: SLOT_LIMIT,
      });
      const hasSlots = slots.length > 0;
      const firstDay = hasSlots ? slots[0].dateStr : null;

      // Deep-link nível-dia (reusa o contrato de resume do booking): abre no dia certo com
      // serviço+profissional travados. Sem slots -> página do tenant (fluxo normal).
      const link = hasSlots
        ? `${appUrl()}/${tenant.slug}?fila=1&s=${cand.serviceId}&p=${pro.id}&d=${firstDay}`
        : `${appUrl()}/${tenant.slug}`;

      const payload = returnReminderCopy({
        name: acc?.name ?? contact.name ?? 'cliente',
        tenantName: tenant.name,
        serviceName: svc.name,
        professionalName: pro.name,
        slots: slots.map(
          (s) => `${WEEKDAY_ABBR[weekdayInTz(s.dateStr, tenant.timezone)]} ${hourLabel(s.label)}`,
        ),
        link,
        unsubscribeUrl: `${appUrl()}/conta/perfil/notificacoes`,
        pushData: {
          type: 'return_reminder',
          tenantSlug: tenant.slug,
          serviceId: cand.serviceId,
          professionalId: hasSlots ? pro.id : null,
          dateStr: firstDay,
        },
        whatsappTemplate: process.env.WHATSAPP_TEMPLATE_RETURN_REMINDER,
      });

      const decision = channelDecision(target, payload, { whatsappOptOut });

      // Claim atômico ANTES de enviar: a unique (contactId, serviceId, cycleAnchor) garante
      // 1 lembrete por ciclo mesmo sob retry concorrente do cron. P2002 = já enviado.
      try {
        await prisma.returnReminder.create({
          data: {
            tenantId: tenant.id,
            contactId: contact.id,
            serviceId: cand.serviceId,
            professionalId: hasSlots ? pro.id : null,
            channel: decision.primary,
            cycleAnchor: cand.cycleAnchor,
          },
        });
      } catch (err) {
        if ((err as { code?: string }).code === 'P2002') continue;
        throw err;
      }

      await notifyPreferOwnChannels(target, payload, { whatsappOptOut });
      sent += 1;
    } catch (err) {
      // Um contato quebrado não pode parar a fila do tenant.
      console.error('[return-reminder] contato falhou', contact.id, err);
      Sentry.captureException(err, {
        tags: { component: 'cron-return-reminders', tenantId: tenant.id, contactId: contact.id },
      });
    }
  }

  return { checked: contacts.length, sent };
}

/** Varre todos os tenants com o lembrete ligado. Erro por tenant é engolido + Sentry. */
export async function dispatchReturnReminders(
  now: Date,
): Promise<{ checked: number; sent: number }> {
  const tenants = await prisma.tenant.findMany({
    where: { returnRemindersEnabled: true },
    select: { id: true, name: true, slug: true, timezone: true },
  });

  let checked = 0;
  let sent = 0;
  for (const tenant of tenants) {
    try {
      const res = await dispatchForTenant(tenant, now);
      checked += res.checked;
      sent += res.sent;
    } catch (err) {
      console.error('[return-reminder] tenant falhou', tenant.id, err);
      Sentry.captureException(err, {
        tags: { component: 'cron-return-reminders', tenantId: tenant.id },
      });
    }
  }
  return { checked, sent };
}

export type ReturnChannelStat = { sent: number; converted: number };
export type ReturnReminderStats = {
  sent: number;
  converted: number;
  byChannel: Record<'PUSH' | 'EMAIL' | 'WHATSAPP' | 'NONE', ReturnChannelStat>;
};

/**
 * Conversão dos lembretes de retorno numa janela: quantos foram enviados e quantos viraram
 * agendamento, POR CANAL. Atribuição por CORRELAÇÃO de janela sobre createdAt (molde do
 * recoveredStats), não por link rígido: conta um agendamento não-cancelado do mesmo contato
 * criado até ATTRIBUTION_DAYS após o envio. Responde "push+email convertem o bastante pra
 * reduzir o WhatsApp?". (Wiring no relatório semanal é follow-on.)
 */
export async function returnReminderStats(
  tenantId: string,
  range: { from: Date; to: Date },
): Promise<ReturnReminderStats> {
  const reminders = await prisma.returnReminder.findMany({
    where: { tenantId, sentAt: { gte: range.from, lt: range.to } },
    select: { contactId: true, channel: true, sentAt: true },
  });

  const empty = (): ReturnChannelStat => ({ sent: 0, converted: 0 });
  const stats: ReturnReminderStats = {
    sent: 0,
    converted: 0,
    byChannel: { PUSH: empty(), EMAIL: empty(), WHATSAPP: empty(), NONE: empty() },
  };
  if (reminders.length === 0) return stats;

  // Agendamentos não-cancelados desses contatos na janela + folga de atribuição (1 query).
  const contactIds = [...new Set(reminders.map((r) => r.contactId))];
  const appts = await prisma.appointment.findMany({
    where: {
      tenantId,
      contactId: { in: contactIds },
      status: { not: 'CANCELED' },
      createdAt: { gte: range.from, lt: new Date(range.to.getTime() + ATTRIBUTION_DAYS * DAY_MS) },
    },
    select: { contactId: true, createdAt: true },
  });
  const byContact = new Map<string, number[]>();
  for (const a of appts) {
    const arr = byContact.get(a.contactId) ?? [];
    arr.push(a.createdAt.getTime());
    byContact.set(a.contactId, arr);
  }

  for (const r of reminders) {
    stats.sent += 1;
    stats.byChannel[r.channel].sent += 1;
    const lo = r.sentAt.getTime();
    const hi = lo + ATTRIBUTION_DAYS * DAY_MS;
    // Converteu = agendou (não-cancelado) DEPOIS do lembrete, dentro da janela de atribuição.
    const converted = (byContact.get(r.contactId) ?? []).some((t) => t > lo && t <= hi);
    if (converted) {
      stats.converted += 1;
      stats.byChannel[r.channel].converted += 1;
    }
  }
  return stats;
}
