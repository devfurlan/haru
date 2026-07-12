import { prisma } from '@haru/database';
import { formatPhoneBR } from '@haru/shared';
import { CalendarDays } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { requireUserAndTenant } from '@/lib/auth';
import { computeLapsed } from '@/lib/lapsed-clients';
import { isWhatsappConnected } from '@/lib/whatsapp-status';

import { LapsedClientsCard } from './lapsed-clients-card';

// Cliente "sumido": era de casa e não volta há este tanto de dias (protótipo Painel do Dono).
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
  const { tenant, name: ownerName } = await requireUserAndTenant();
  const tz = tenant.timezone;

  const now = new Date();
  // Limites do dia em horário local do servidor (mesma abordagem do dashboard antigo).
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const weekday = now.getDay();

  const [todayAppts, pendingCount, blocks, recent, lapsedContacts] = await Promise.all([
    prisma.appointment.findMany({
      where: { tenantId: tenant.id, startsAt: { gte: dayStart, lt: dayEnd }, status: { not: 'CANCELED' } },
      include: { service: true, contact: true, professional: true },
      orderBy: { startsAt: 'asc' },
    }),
    prisma.appointment.count({
      where: { tenantId: tenant.id, status: 'PENDING', startsAt: { gte: now } },
    }),
    prisma.scheduleBlock.findMany({ where: { tenantId: tenant.id, weekday } }),
    prisma.appointment.findMany({
      where: { tenantId: tenant.id, createdAt: { gte: new Date(now.getTime() - 36 * 3600 * 1000) } },
      include: { service: true, contact: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    // ponytail: scan de contatos+agendamentos por load do cockpit, limitado a 1000
    // contatos. Se o histórico de um tenant crescer muito, materializar um count/soma.
    prisma.contact.findMany({
      where: { tenantId: tenant.id },
      select: {
        id: true,
        name: true,
        phone: true,
        appointments: {
          select: { startsAt: true, status: true, service: { select: { name: true, priceCents: true } } },
        },
      },
      take: 1000,
    }),
  ]);

  const lapsed = computeLapsed(lapsedContacts, now, LAPSE_DAYS);

  // KPIs
  const receitaCents = todayAppts.reduce((sum, a) => sum + a.service.priceCents, 0);
  const bookedMin = todayAppts.reduce(
    (sum, a) => sum + (a.endsAt.getTime() - a.startsAt.getTime()) / 60000,
    0,
  );
  const availableMin = blocks.reduce((sum, b) => sum + (b.endMinute - b.startMinute), 0);
  const ocupacao = availableMin > 0 ? Math.min(100, Math.round((bookedMin / availableMin) * 100)) : 0;

  // cor por profissional (estável por ordem de id no dia)
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

  const whatsappConnected = isWhatsappConnected(tenant);
  const firstName = (ownerName ?? '').trim().split(/\s+/)[0] || 'você';
  const clientName = (c: { name: string | null; phone: string | null }) =>
    c.name ?? (c.phone ? formatPhoneBR(c.phone) : 'Cliente');

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-5">
      {/* header */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-[260px] flex-1">
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-50">
            {dateLabel}
          </div>
          <h1 className="font-serif text-3xl tracking-tight text-ink">
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

      {/* KPIs */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5">
        <Kpi label="Agendamentos hoje" value={String(todayAppts.length)} sub="marcados pra hoje" />
        <Kpi
          label="Receita prevista"
          value={money(receitaCents)}
          sub="somando o dia"
          subClass="text-green-emph"
        />
        <div className="rounded-2xl border border-line bg-paper p-4 shadow-soft">
          <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-50">
            Ocupação do dia
          </div>
          <div className="mb-2 mt-1.5 font-serif text-3xl text-ink">{ocupacao}%</div>
          <div className="h-1.5 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-green-bright" style={{ width: `${ocupacao}%` }} />
          </div>
        </div>
        <Kpi
          label="Pendentes"
          value={String(pendingCount)}
          sub="aguardando confirmação"
          valueClass={pendingCount > 0 ? 'text-coral' : undefined}
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* Agora e a seguir */}
        <div className="overflow-hidden rounded-[18px] border border-line bg-paper shadow-soft">
          <div className="flex items-baseline gap-2.5 px-[18px] pb-2.5 pt-4">
            <div className="font-serif text-lg text-ink">Agora e a seguir</div>
            <div className="text-xs font-medium text-ink-50">seu dia, do começo ao fim</div>
            <Link
              href="/appointments"
              className="ml-auto text-xs font-semibold text-green-emph no-underline hover:underline"
            >
              Agenda completa →
            </Link>
          </div>

          {todayAppts.length === 0 ? (
            <div className="m-[18px] mt-2 rounded-2xl border border-dashed border-edge px-6 py-9 text-center">
              <div className="mx-auto mb-3 flex size-[50px] items-center justify-center rounded-[15px] bg-chip text-green-emph">
                <CalendarDays className="size-6" strokeWidth={2.1} />
              </div>
              <div className="font-serif text-xl text-ink">
                Tá tudo <em className="text-green-emph">livre</em> por aqui
              </div>
              <p className="mx-auto mt-1.5 max-w-[340px] text-[13px] leading-relaxed text-ink-50">
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
                    className="flex items-center gap-3 border-t border-dotted border-edge px-[18px] py-2.5"
                  >
                    <div className="w-[52px] flex-none font-serif text-base text-ink">
                      {hm(a.startsAt, tz)}
                    </div>
                    <div className="flex w-[9px] flex-none justify-center">
                      {live && (
                        <span className="size-2 rounded-full bg-green-bright animate-pulse-ring" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-semibold text-ink">
                        {clientName(a.contact)}
                      </div>
                      <div className="truncate text-[11.5px] font-medium text-ink-50">
                        {a.service.name}
                      </div>
                    </div>
                    <div className="hidden w-[84px] flex-none items-center gap-1.5 text-xs font-medium text-ink-70 sm:flex">
                      <span
                        className="size-[7px] flex-none rounded-full"
                        style={{ background: proColor(a.professionalId) }}
                      />
                      <span className="truncate">
                        {(a.professional.name ?? '').split(/\s+/)[0] || '—'}
                      </span>
                    </div>
                    <div className="w-[56px] flex-none text-right font-serif text-[14.5px] text-ink">
                      {money(a.service.priceCents)}
                    </div>
                    <div className="flex w-[88px] flex-none justify-end">
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
          <div className="flex flex-col gap-3 rounded-[18px] border border-line bg-paper p-[18px] shadow-soft">
            <div className="flex items-center gap-2 font-serif text-[17px] text-ink">
              Precisa de você
              {pendingCount > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-coral px-1.5 text-[11px] font-bold text-white">
                  {pendingCount}
                </span>
              )}
            </div>

            {!whatsappConnected && (
              <Link
                href="/settings"
                className="block rounded-2xl border border-coral-tint bg-coral-tint p-3.5 no-underline"
                style={{ borderColor: '#ffd6c9' }}
              >
                <div className="text-[13px] font-semibold text-ink">WhatsApp não conectado</div>
                <div className="mt-0.5 text-[11.5px] text-ink-50">
                  Conecte pra o bot receber e responder seus clientes · configurar →
                </div>
              </Link>
            )}

            {pendingCount > 0 && (
              <Link
                href="/appointments?tab=upcoming"
                className="block rounded-2xl border border-line bg-cream p-3.5 no-underline"
              >
                <div className="text-[13px] font-semibold text-ink">
                  {pendingCount} {pendingCount === 1 ? 'agendamento aguardando' : 'agendamentos aguardando'} confirmação
                </div>
                <div className="mt-0.5 text-[11.5px] text-ink-50">
                  feitos pela página pública · revisar agora →
                </div>
              </Link>
            )}

            {whatsappConnected && pendingCount === 0 && (
              <div className="rounded-2xl border border-dashed border-edge px-4 py-5 text-center">
                <div className="font-serif text-[15px] text-ink">
                  Nada precisa de você <em className="text-green-emph">agora</em>
                </div>
                <p className="mt-1 text-xs text-ink-50">
                  Pedidos e avisos que precisam do seu ok aparecem aqui.
                </p>
              </div>
            )}
          </div>

          {/* Acontecendo agora */}
          <div className="rounded-[18px] border border-line bg-paper p-[18px] shadow-soft">
            <div className="mb-2.5 flex items-center gap-1.5 font-serif text-[17px] text-ink">
              <span className="size-2 rounded-full bg-green-bright animate-pulse-ring" />
              Acontecendo agora
            </div>
            {recent.length === 0 ? (
              <p className="text-[12.5px] leading-relaxed text-ink-50">
                Tudo quieto por enquanto. Marcou, remarcou, mandou mensagem - pinta tudo aqui na hora.
              </p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {recent.map((a) => (
                  <div key={a.id} className="flex gap-2.5 text-[12.5px] leading-snug text-ink-70">
                    <span className="flex-none font-semibold text-ink-30">{hm(a.createdAt, tz)}</span>
                    <span>
                      <strong className="font-semibold text-ink">{clientName(a.contact)}</strong> marcou{' '}
                      {a.service.name} · {hm(a.startsAt, tz)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Clientes sumidos - win-back (só aparece quando há alguém pra chamar de volta) */}
      <LapsedClientsCard data={lapsed} tz={tz} lapseDays={LAPSE_DAYS} />
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  subClass,
  valueClass,
}: {
  label: string;
  value: string;
  sub: string;
  subClass?: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-paper p-4 shadow-soft">
      <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-50">{label}</div>
      <div className={`mt-1.5 font-serif text-3xl ${valueClass ?? 'text-ink'}`}>{value}</div>
      <div className={`text-xs font-medium ${subClass ?? 'text-ink-50'}`}>{sub}</div>
    </div>
  );
}
