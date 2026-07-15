import 'server-only';

// Leitura dos dados do RELATÓRIO SEMANAL do dono (semana anterior, fuso do tenant). Só lê e
// delega a matemática pro núcleo puro (weekly-report-core.ts, coberto pelo self-check).
// Métricas que já existem são reusadas, não reimplementadas: comparecimento
// (computeAttendanceStats), vagas recuperadas (recoveredStats) e MRR do Clube
// (getSubscriptionMetrics). Quem envia é comms/events.ts; quem dispara é o cron.

import { prisma } from '@haru/database';

import { computeAttendanceStats, type AttendanceApptInput } from '@/lib/attendance';
import { getSubscriptionMetrics } from '@/lib/subscriptions-panel';
import { recoveredStats } from '@/lib/waitlist-panel';
import { buildWeeklyReport, weekWindow, type WeeklyReportData } from '@/lib/weekly-report-core';

/** O que o relatório precisa saber do tenant (o cron já carrega essas colunas). */
export interface WeeklyReportTenant {
  id: string;
  timezone: string;
  waitlistEnabled: boolean;
  reminderMinutesBefore: number;
}

/**
 * Monta o relatório da última semana completa do tenant. Retorna null quando a semana não
 * teve nenhum agendamento (não se envia relatório vazio) - nesse caso sai cedo, antes das
 * consultas caras.
 */
export async function getWeeklyReportData(
  tenant: WeeklyReportTenant,
  now = new Date(),
): Promise<WeeklyReportData | null> {
  const window = weekWindow(now, tenant.timezone);

  const appts = await prisma.appointment.findMany({
    where: { tenantId: tenant.id, startsAt: { gte: window.start, lt: window.end } },
    select: {
      startsAt: true,
      endsAt: true,
      status: true,
      attendanceConfirmed: true,
      contactId: true,
      professionalId: true,
      serviceId: true,
      professional: { select: { name: true } },
      service: { select: { name: true, priceCents: true, durationMinutes: true } },
    },
  });
  if (appts.length === 0) return null;

  const [prevAppts, blocks, exceptions, firstVisits, club] = await Promise.all([
    prisma.appointment.findMany({
      where: { tenantId: tenant.id, startsAt: { gte: window.prevStart, lt: window.start } },
      select: { startsAt: true, status: true, service: { select: { priceCents: true } } },
    }),
    prisma.scheduleBlock.findMany({
      where: { tenantId: tenant.id },
      select: { professionalId: true, weekday: true, startMinute: true, endMinute: true },
    }),
    prisma.scheduleException.findMany({
      where: { tenantId: tenant.id, startsAt: { lt: window.end }, endsAt: { gt: window.start } },
      select: { professionalId: true, startsAt: true, endsAt: true },
    }),
    // Primeira vez de cada contato no tenant (histórico inteiro) - âncora do novo x
    // recorrente. Não-cancelado: quem faltou já era cliente conhecido, só não veio.
    prisma.appointment.groupBy({
      by: ['contactId'],
      where: { tenantId: tenant.id, status: { not: 'CANCELED' } },
      _min: { startsAt: true },
    }),
    getSubscriptionMetrics(tenant.id, now),
  ]);

  // Mesmo recorte da métrica canônica de comparecimento (getAttendanceRows): já terminou e
  // não foi cancelado. Deriva das linhas da semana que já estão em memória.
  const attendanceInputs: AttendanceApptInput[] = appts
    .filter((a) => a.status !== 'CANCELED' && a.endsAt < now)
    .map((a) => ({
      status: a.status,
      attendanceConfirmed: a.attendanceConfirmed,
      professionalId: a.professionalId,
      professionalName: a.professional.name,
    }));

  const firstVisitByContact = new Map<string, Date>();
  for (const f of firstVisits) {
    if (f._min.startsAt) firstVisitByContact.set(f.contactId, f._min.startsAt);
  }

  const recovered = tenant.waitlistEnabled
    ? await recoveredStats(tenant.id, { from: window.start, to: window.end })
    : null;

  return buildWeeklyReport({
    tz: tenant.timezone,
    now,
    window,
    appts: appts.map((a) => ({
      startsAt: a.startsAt,
      endsAt: a.endsAt,
      status: a.status,
      contactId: a.contactId,
      professionalId: a.professionalId,
      serviceId: a.serviceId,
      serviceName: a.service.name,
      priceCents: a.service.priceCents,
      durationMinutes: a.service.durationMinutes,
    })),
    prevAppts: prevAppts.map((a) => ({
      startsAt: a.startsAt,
      status: a.status,
      priceCents: a.service.priceCents,
    })),
    attendance: computeAttendanceStats(attendanceInputs),
    blocks,
    exceptions,
    firstVisitByContact,
    reminderMinutesBefore: tenant.reminderMinutesBefore,
    // Blocos condicionais: só aparecem se o estabelecimento de fato usa a feature.
    recovered: recovered && recovered.count > 0 ? recovered : null,
    club: club.activeCount > 0 ? { mrrCents: club.mrrCents, activeCount: club.activeCount } : null,
  });
}
