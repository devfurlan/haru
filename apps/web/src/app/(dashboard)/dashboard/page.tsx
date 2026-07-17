import { prisma } from '@haru/database';
import { formatPhoneBR, isoDateInTz, localWallTimeToUtc } from '@haru/shared';
import { CalendarDays, Sparkles } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { computeAttendanceStats, getAttendanceRows } from '@/lib/attendance';
import { requireUserAndTenant } from '@/lib/auth';
import { getDashboard } from '@/lib/dashboard';
import { computeLapsed } from '@/lib/lapsed-clients';
import { panelRole } from '@/lib/permissions';
import { getRecoveryMetric } from '@/lib/waitlist-panel';
import { isWhatsappConnected } from '@/lib/whatsapp-status';

import { AttendanceCard } from './attendance-card';
import { AutoRefresh } from './auto-refresh';
import { DayCloseCard, type DayCloseGroup } from './day-close-card';
import { LapsedClientsCard } from './lapsed-clients-card';
import { TeamHome } from './team-home';
import {
  DayCountsCard,
  FilaCard,
  MrrCard,
  OccupancyCard,
  PeriodRevenueCard,
  RevenueTodayCard,
} from './metric-cards';
import { RecoveryBanner } from './recovery-banner';

// Cliente "sumido": era de casa e não volta há este tanto de dias.
const LAPSE_DAYS = 60;

const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 0,
});
const money = (cents: number) => BRL.format(Math.round(cents / 100));

const PRO_DOTS = ['#2FD37A', '#FF5A36', '#0e7a45', '#c2401f', '#1b7a4b', '#8a6116'];

function hm(date: Date, tz: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(date)
    .replace(':', 'h');
}

type Status = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'NO_SHOW' | 'CANCELED';

function statusPill(status: Status, live: boolean): { bg: string; fg: string; label: string } {
  if (live) return { bg: 'rgba(47,211,122,.16)', fg: '#1b7a4b', label: 'Em atendimento' };
  switch (status) {
    case 'CONFIRMED':
      return { bg: 'var(--brand-chip)', fg: '#1b7a4b', label: 'Confirmado' };
    case 'PENDING':
      return { bg: 'var(--brand-coral-tint)', fg: '#c2401f', label: 'Pendente' };
    case 'COMPLETED':
      return { bg: '#efe9d8', fg: '#7c8a80', label: 'Atendido' };
    case 'NO_SHOW':
      return { bg: '#efe9d8', fg: '#7c8a80', label: 'Faltou' };
    default:
      return { bg: '#efe9d8', fg: '#7c8a80', label: '—' };
  }
}

export default async function DashboardPage() {
  const user = await requireUserAndTenant();
  const role = panelRole(user);
  // Equipe (profissional/apoio) vê o Início REDUZIDO, sem dinheiro. Só o dono vê o cockpit cheio.
  if (role !== 'OWNER') return <TeamHome user={user} role={role} />;

  const { tenant, name: ownerName } = user;
  const tz = tenant.timezone;
  const now = new Date();

  // Dia-calendário no FUSO DO TENANT (não do servidor/UTC): senão os atendimentos da noite BRT
  // cairiam no dia UTC seguinte. Alinhado com o motor (getDashboard usa a mesma âncora).
  const tzDayStart = localWallTimeToUtc(isoDateInTz(now, tz), 0, tz);
  const tzDayEnd = new Date(tzDayStart.getTime() + 24 * 60 * 60 * 1000);

  const [
    dashboard,
    todayAppts,
    pendingCount,
    recent,
    lapsedContacts,
    attendanceRows,
    recoveryMetric,
  ] = await Promise.all([
    // TODOS os números (faturamento/contagens/ocupação/mrr/fila/destaques) vêm do MOTOR.
    getDashboard(tenant, now),
    // Lista operacional do dia (nomes de cliente/profissional) - não é métrica, é a agenda.
    prisma.appointment.findMany({
      where: {
        tenantId: tenant.id,
        startsAt: { gte: tzDayStart, lt: tzDayEnd },
        status: { not: 'CANCELED' },
      },
      include: { service: true, contact: true, professional: true },
      orderBy: { startsAt: 'asc' },
    }),
    prisma.appointment.count({
      where: { tenantId: tenant.id, status: 'PENDING', startsAt: { gte: now } },
    }),
    prisma.appointment.findMany({
      where: {
        tenantId: tenant.id,
        createdAt: { gte: new Date(now.getTime() - 36 * 3600 * 1000) },
      },
      include: { service: true, contact: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    // ponytail: scan de contatos+agendamentos por load, limitado a 1000. Se o histórico de um
    // tenant crescer muito, materializar. (win-back, não é métrica do motor.)
    prisma.contact.findMany({
      where: { tenantId: tenant.id },
      select: {
        id: true,
        name: true,
        phone: true,
        appointments: {
          select: {
            startsAt: true,
            endsAt: true,
            status: true,
            service: { select: { name: true, priceCents: true } },
          },
        },
      },
      take: 1000,
    }),
    getAttendanceRows(tenant.id, new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)),
    getRecoveryMetric(tenant.id, tz),
  ]);

  const lapsed = computeLapsed(lapsedContacts, now, LAPSE_DAYS);

  // Fechar o dia: os de hoje que JÁ terminaram (deriva da lista, sem query extra).
  const dayEnded = todayAppts.filter((a) => a.endsAt < now);
  const dayCloseGroups: DayCloseGroup[] = [];
  const groupIndex = new Map<string, DayCloseGroup>();
  for (const a of dayEnded) {
    let g = groupIndex.get(a.professionalId);
    if (!g) {
      g = { professionalName: a.professional.name ?? 'Profissional', appts: [] };
      groupIndex.set(a.professionalId, g);
      dayCloseGroups.push(g);
    }
    g.appts.push({
      id: a.id,
      clientName: a.contact.name ?? (a.contact.phone ? formatPhoneBR(a.contact.phone) : 'Cliente'),
      timeLabel: hm(a.startsAt, tz),
      serviceName: a.service.name,
      priceLabel: money(a.service.priceCents),
      attended: a.status !== 'NO_SHOW',
    });
  }
  const dayAllConfirmed = dayEnded.length > 0 && dayEnded.every((a) => a.attendanceConfirmed);

  const from7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const stats30 = computeAttendanceStats(attendanceRows.map((r) => r.input));
  const stats7 = computeAttendanceStats(
    attendanceRows.filter((r) => r.startsAt >= from7).map((r) => r.input),
  );

  const proIds = [...new Set(todayAppts.map((a) => a.professionalId))];
  const proColor = (id: string) => PRO_DOTS[proIds.indexOf(id) % PRO_DOTS.length];

  const greetHour = Number(
    new Intl.DateTimeFormat('pt-BR', { timeZone: tz, hour: 'numeric', hour12: false })
      .formatToParts(now)
      .find((p) => p.type === 'hour')?.value ?? 12,
  );
  const greeting = greetHour < 12 ? 'Bom dia' : greetHour < 18 ? 'Boa tarde' : 'Boa noite';
  const dateLabel = new Intl.DateTimeFormat('pt-BR', {
    timeZone: tz,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(now);
  const weekdayLabel = new Intl.DateTimeFormat('pt-BR', { timeZone: tz, weekday: 'long' })
    .format(now)
    .replace('-feira', '');

  const whatsappConnected = isWhatsappConnected(tenant);
  const firstName = (ownerName ?? '').trim().split(/\s+/)[0] || 'você';
  const clientName = (c: { name: string | null; phone: string | null }) =>
    c.name ?? (c.phone ? formatPhoneBR(c.phone) : 'Cliente');

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-5">
      <AutoRefresh />

      {/* header */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-[260px] flex-1">
          <div className="text-ink-50 mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em]">
            {dateLabel}
          </div>
          <h1 className="text-ink font-serif text-3xl tracking-tight">
            {greeting}, <em className="text-green-emph">{firstName}</em>
          </h1>
        </div>
        <div className="flex flex-none items-center gap-2.5">
          <Button asChild variant="outline">
            <Link href="/appointments">Bloquear horário</Link>
          </Button>
          <Button asChild variant="coral">
            <Link href="/appointments/new">Novo agendamento</Link>
          </Button>
        </div>
      </div>

      {/* Destaques acionáveis - some quando não há nada a dizer */}
      {dashboard.highlights.length > 0 && (
        <div className="flex flex-wrap gap-2.5">
          {dashboard.highlights.map((h) => (
            <div
              key={h}
              className="border-line bg-paper shadow-soft text-ink-70 flex items-center gap-2 rounded-full border py-1.5 pl-2 pr-4 text-[13px] font-medium"
            >
              <span className="bg-chip text-green-emph flex size-6 flex-none items-center justify-center rounded-full">
                <Sparkles className="size-3.5" strokeWidth={2.3} />
              </span>
              {h}
            </div>
          ))}
        </div>
      )}

      <RecoveryBanner metric={recoveryMetric} />

      {/* Hero do dia: faturamento + agendamentos + ocupação */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <RevenueTodayCard
            revenueCents={dashboard.today.revenueCents}
            prevRevenueCents={dashboard.today.prevRevenueCents}
            trend={dashboard.today.trend}
            weekdayLabel={weekdayLabel}
          />
        </div>
        <DayCountsCard
          total={dashboard.today.total}
          realized={dashboard.today.realized}
          upcoming={dashboard.today.upcoming}
          noShow={dashboard.today.noShow}
        />
        <OccupancyCard pct={dashboard.today.occupancyPct} />
      </div>

      {/* Semana + mês + (se houver) assinatura e fila */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <PeriodRevenueCard
          label="Esta semana"
          sub="de segunda até agora"
          revenueCents={dashboard.week.revenueCents}
          trend={dashboard.week.trend}
        />
        <PeriodRevenueCard
          label="Este mês"
          sub="desde o dia 1"
          revenueCents={dashboard.month.revenueCents}
          trend={dashboard.month.trend}
        />
        {dashboard.mrr && (
          <MrrCard cents={dashboard.mrr.cents} activeCount={dashboard.mrr.activeCount} />
        )}
        {dashboard.waiting != null && <FilaCard waiting={dashboard.waiting} />}
      </div>

      <DayCloseCard groups={dayCloseGroups} allConfirmed={dayAllConfirmed} />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* Agora e a seguir */}
        <div className="border-line bg-paper shadow-soft overflow-hidden rounded-[18px] border">
          <div className="px-4.5 flex items-baseline gap-2.5 pb-2.5 pt-4">
            <div className="text-ink font-serif text-lg">Agora e a seguir</div>
            <div className="text-ink-50 text-xs font-medium">seu dia, do começo ao fim</div>
            <Link
              href="/appointments"
              className="text-green-emph ml-auto text-xs font-semibold no-underline hover:underline"
            >
              Agenda completa →
            </Link>
          </div>

          {todayAppts.length === 0 ? (
            <div className="border-edge m-4.5 mt-2 rounded-2xl border border-dashed px-6 py-9 text-center">
              <div className="bg-chip text-green-emph size-12.5 mx-auto mb-3 flex items-center justify-center rounded-[15px]">
                <CalendarDays className="size-6" strokeWidth={2.1} />
              </div>
              <div className="text-ink font-serif text-xl">
                Tá tudo <em className="text-green-emph">livre</em> por aqui
              </div>
              <p className="text-ink-50 mx-auto mt-1.5 max-w-[340px] text-[13px] leading-relaxed">
                Nenhum horário marcado ainda. Qualquer agendamento pelo app ou pela sua página
                aparece aqui na hora.
              </p>
            </div>
          ) : (
            <ul>
              {todayAppts.map((a) => {
                const live = now >= a.startsAt && now < a.endsAt;
                const pill = statusPill(a.status as Status, live);
                return (
                  <li
                    key={a.id}
                    className="border-edge px-4.5 flex items-center gap-3 border-t border-dotted py-2.5"
                  >
                    <div className="text-ink w-13 flex-none font-serif text-base">
                      {hm(a.startsAt, tz)}
                    </div>
                    <div className="flex w-[9px] flex-none justify-center">
                      {live && (
                        <span className="bg-green-bright animate-pulse-ring size-2 rounded-full" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-ink truncate text-[13.5px] font-semibold">
                        {clientName(a.contact)}
                      </div>
                      <div className="text-ink-50 truncate text-[11.5px] font-medium">
                        {a.service.name}
                      </div>
                    </div>
                    <div className="text-ink-70 w-21 hidden flex-none items-center gap-1.5 text-xs font-medium sm:flex">
                      {/* ponytail: runtime, Tailwind nao gera */}
                      <span
                        className="size-[7px] flex-none rounded-full"
                        style={{ background: proColor(a.professionalId) }}
                      />
                      <span className="truncate">
                        {(a.professional.name ?? '').split(/\s+/)[0] || '—'}
                      </span>
                    </div>
                    <div className="text-ink w-14 flex-none text-right font-serif text-[14.5px]">
                      {money(a.service.priceCents)}
                    </div>
                    <div className="w-22 flex flex-none justify-end">
                      {/* ponytail: runtime, Tailwind nao gera */}
                      <span
                        className="whitespace-nowrap rounded-full px-2.5 py-1 text-[10.5px] font-semibold"
                        style={{ background: pill.bg, color: pill.fg }}
                      >
                        {pill.label}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* coluna direita */}
        <div className="flex flex-col gap-4">
          {/* Precisa de você */}
          <div className="border-line bg-paper shadow-soft p-4.5 flex flex-col gap-3 rounded-[18px] border">
            <div className="text-ink flex items-center gap-2 font-serif text-[17px]">
              Precisa de você
              {pendingCount > 0 && (
                <span className="bg-coral inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white">
                  {pendingCount}
                </span>
              )}
            </div>

            {!whatsappConnected && (
              <Link
                href="/settings"
                className="bg-coral-tint block rounded-2xl border border-[#ffd6c9] p-3.5 no-underline"
              >
                <div className="text-ink text-[13px] font-semibold">WhatsApp não conectado</div>
                <div className="text-ink-50 mt-0.5 text-[11.5px]">
                  Conecte pra o bot receber e responder seus clientes · configurar →
                </div>
              </Link>
            )}

            {pendingCount > 0 && (
              <Link
                href="/appointments?tab=upcoming"
                className="border-line bg-cream block rounded-2xl border p-3.5 no-underline"
              >
                <div className="text-ink text-[13px] font-semibold">
                  {pendingCount}{' '}
                  {pendingCount === 1 ? 'agendamento aguardando' : 'agendamentos aguardando'}{' '}
                  confirmação
                </div>
                <div className="text-ink-50 mt-0.5 text-[11.5px]">
                  feitos pela página pública · revisar agora →
                </div>
              </Link>
            )}

            {whatsappConnected && pendingCount === 0 && (
              <div className="border-edge rounded-2xl border border-dashed px-4 py-5 text-center">
                <div className="text-ink font-serif text-[15px]">
                  Nada precisa de você <em className="text-green-emph">agora</em>
                </div>
                <p className="text-ink-50 mt-1 text-xs">
                  Pedidos e avisos que precisam do seu ok aparecem aqui.
                </p>
              </div>
            )}
          </div>

          {/* Acontecendo agora */}
          <div className="border-line bg-paper shadow-soft p-4.5 rounded-[18px] border">
            <div className="text-ink mb-2.5 flex items-center gap-1.5 font-serif text-[17px]">
              <span className="bg-green-bright animate-pulse-ring size-2 rounded-full" />
              Acontecendo agora
            </div>
            {recent.length === 0 ? (
              <p className="text-ink-50 text-[12.5px] leading-relaxed">
                Tudo quieto por enquanto. Marcou, remarcou, mandou mensagem - pinta tudo aqui na
                hora.
              </p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {recent.map((a) => (
                  <div key={a.id} className="text-ink-70 flex gap-2.5 text-[12.5px] leading-snug">
                    <span className="text-ink-30 flex-none font-semibold">
                      {hm(a.createdAt, tz)}
                    </span>
                    <span>
                      <strong className="text-ink font-semibold">{clientName(a.contact)}</strong>{' '}
                      marcou {a.service.name} · {hm(a.startsAt, tz)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Comparecimento - só aparece quando há atendimento fechado no histórico */}
      <AttendanceCard stats7={stats7} stats30={stats30} />

      {/* Clientes sumidos - win-back (só aparece quando há alguém pra chamar de volta) */}
      <LapsedClientsCard data={lapsed} tz={tz} lapseDays={LAPSE_DAYS} />
    </div>
  );
}
