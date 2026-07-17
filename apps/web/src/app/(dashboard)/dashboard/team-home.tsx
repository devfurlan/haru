import { prisma } from '@haru/database';
import { formatPhoneBR, isoDateInTz, localWallTimeToUtc } from '@haru/shared';
import { CalendarDays } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { getMetrics } from '@/lib/metrics/metrics';
import type { PanelRole } from '@/lib/permissions';
import { dataScope } from '@/lib/permissions';

import { AutoRefresh } from './auto-refresh';
import { DayCountsCard, OccupancyCard } from './metric-cards';

// Início REDUZIDO da equipe (profissional/apoio): operacional, SEM dinheiro (faturamento,
// comissões, receita por cliente, win-back). Profissional vê só a PRÓPRIA agenda; apoio vê a de
// todos (dataScope). Nenhum valor de R$ é renderizado aqui.

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

const clientName = (c: { name: string | null; phone: string | null }) =>
  c.name ?? (c.phone ? formatPhoneBR(c.phone) : 'Cliente');

export async function TeamHome({
  user,
  role,
}: {
  user: { id: string; name: string | null; tenant: { id: string; timezone: string } };
  role: PanelRole;
}) {
  const tenant = user.tenant;
  const tz = tenant.timezone;
  const now = new Date();
  const scope = dataScope(role); // 'own' (profissional) | 'all' (apoio)
  const professionalId = scope === 'own' ? user.id : undefined;

  const tzDayStart = localWallTimeToUtc(isoDateInTz(now, tz), 0, tz);
  const tzDayEnd = new Date(tzDayStart.getTime() + 24 * 60 * 60 * 1000);

  const [metrics, todayAppts, pendingCount] = await Promise.all([
    // Contagens + ocupação (do motor, escopado). Faturamento/mrr vêm no objeto mas NÃO são
    // renderizados - a equipe não vê dinheiro.
    getMetrics({
      scope: { tenantId: tenant.id },
      from: tzDayStart,
      to: tzDayEnd,
      now,
      professionalId,
    }),
    prisma.appointment.findMany({
      where: {
        tenantId: tenant.id,
        startsAt: { gte: tzDayStart, lt: tzDayEnd },
        status: { not: 'CANCELED' },
        ...(professionalId ? { professionalId } : {}),
      },
      include: { service: { select: { name: true } }, contact: true },
      orderBy: { startsAt: 'asc' },
    }),
    prisma.appointment.count({
      where: {
        tenantId: tenant.id,
        status: 'PENDING',
        startsAt: { gte: now },
        ...(professionalId ? { professionalId } : {}),
      },
    }),
  ]);

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
  const firstName = (user.name ?? '').trim().split(/\s+/)[0] || 'você';

  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-5">
      <AutoRefresh />

      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-[240px] flex-1">
          <div className="text-ink-50 mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em]">
            {dateLabel}
          </div>
          <h1 className="text-ink font-serif text-3xl tracking-tight">
            {greeting}, <em className="text-green-emph">{firstName}</em>
          </h1>
          <p className="text-ink-50 mt-1 text-[13px]">
            {scope === 'own' ? 'Sua agenda de hoje.' : 'A agenda de hoje da equipe.'}
          </p>
        </div>
        <Button asChild variant="coral">
          <Link href="/appointments/new">Novo agendamento</Link>
        </Button>
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2">
        <DayCountsCard
          total={metrics.total}
          realized={metrics.realized}
          upcoming={metrics.upcoming}
          noShow={metrics.noShow}
        />
        <OccupancyCard
          pct={
            metrics.occupancy.capacityMin > 0 ? Math.round(metrics.occupancy.occupancy * 100) : 0
          }
        />
      </div>

      <div className="border-line bg-paper shadow-soft overflow-hidden rounded-[18px] border">
        <div className="px-4.5 flex items-baseline gap-2.5 pb-2.5 pt-4">
          <div className="text-ink font-serif text-lg">Agora e a seguir</div>
          {pendingCount > 0 && (
            <span className="bg-coral inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white">
              {pendingCount}
            </span>
          )}
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
              Nada marcado <em className="text-green-emph">por enquanto</em>
            </div>
            <p className="text-ink-50 mx-auto mt-1.5 max-w-[340px] text-[13px] leading-relaxed">
              Qualquer agendamento novo aparece aqui na hora.
            </p>
          </div>
        ) : (
          <ul>
            {todayAppts.map((a) => {
              const live = now >= a.startsAt && now < a.endsAt;
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
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
