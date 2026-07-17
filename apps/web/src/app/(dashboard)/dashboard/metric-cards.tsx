// Cards de número do dashboard (apresentacionais, server components). Recebem SÓ números já
// vindos do motor (via getDashboard) - não calculam nada. Seguem os tokens do painel
// (border-line/bg-paper/shadow-soft, serifa nos números grandes, verde/coral nos deltas).

import { CalendarCheck, Clock, TrendingDown, TrendingUp, Users, Wallet } from 'lucide-react';
import Link from 'next/link';

import type { Trend } from '@/lib/dashboard-core';
import { formatBRLShort } from '@haru/shared';

const money = formatBRLShort;

/** Pílula de tendência: verde pra cima, coral pra baixo. Sem base = "novo". */
export function TrendChip({ trend, suffix }: { trend: Trend; suffix?: string }) {
  if (trend.deltaPct === null) {
    if (trend.deltaCents <= 0) return null; // sem base e sem valor: nada a mostrar
    return (
      <span className="bg-chip text-green-emph inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold">
        <TrendingUp className="size-3" strokeWidth={2.4} /> novo
      </span>
    );
  }
  if (trend.dir === 'flat') {
    return (
      <span className="bg-cream-2 text-ink-50 inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold">
        estável
      </span>
    );
  }
  const up = trend.dir === 'up';
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold ${
        up ? 'bg-chip text-green-emph' : 'bg-coral-tint text-coral-deep'
      }`}
    >
      {up ? (
        <TrendingUp className="size-3" strokeWidth={2.4} />
      ) : (
        <TrendingDown className="size-3" strokeWidth={2.4} />
      )}
      {up ? '+' : ''}
      {trend.deltaPct}%{suffix ? ` ${suffix}` : ''}
    </span>
  );
}

/** HERO: faturamento de hoje (realizado até agora) + ritmo vs mesmo horário da semana passada. */
export function RevenueTodayCard({
  revenueCents,
  prevRevenueCents,
  trend,
  weekdayLabel,
}: {
  revenueCents: number;
  prevRevenueCents: number;
  trend: Trend;
  weekdayLabel: string;
}) {
  return (
    <div className="border-line shadow-soft rounded-2xl border p-5 [background:radial-gradient(520px_220px_at_10%_-30%,rgba(47,211,122,.15),transparent_60%),var(--brand-paper)]">
      <div className="flex items-center justify-between gap-3">
        <div className="text-green-emph flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.13em]">
          <span className="bg-green-bright animate-pulse-ring size-[7px] rounded-full" />
          Faturamento de hoje
        </div>
        <TrendChip trend={trend} />
      </div>
      <div className="text-ink mt-2 font-serif text-[clamp(2.4rem,7vw,3.25rem)] leading-none">
        {money(revenueCents)}
      </div>
      <div className="text-ink-50 mt-2 text-[12.5px] font-medium">
        {prevRevenueCents > 0
          ? `${money(prevRevenueCents)} no mesmo horário ${weekdayLabel} passada`
          : 'realizado até agora - o dia ainda tá rolando'}
      </div>
    </div>
  );
}

/** Agendamentos de hoje: total grande + quebra atendidos / a vir / faltaram. */
export function DayCountsCard({
  total,
  realized,
  upcoming,
  noShow,
}: {
  total: number;
  realized: number;
  upcoming: number;
  noShow: number;
}) {
  return (
    <div className="border-line bg-paper shadow-soft rounded-2xl border p-4">
      <div className="text-ink-50 text-[10.5px] font-bold uppercase tracking-[0.12em]">
        Agendamentos hoje
      </div>
      <div className="text-ink mt-1.5 font-serif text-3xl leading-none">{total}</div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] font-medium">
        <span className="text-green-emph inline-flex items-center gap-1">
          <CalendarCheck className="size-3.5" strokeWidth={2.2} />
          {realized} atendidos
        </span>
        <span className="text-ink-70 inline-flex items-center gap-1">
          <Clock className="size-3.5" strokeWidth={2.2} />
          {upcoming} a vir
        </span>
        {noShow > 0 && <span className="text-coral-deep">{noShow} faltaram</span>}
      </div>
    </div>
  );
}

/** Ocupação do dia: % + barra. */
export function OccupancyCard({ pct }: { pct: number }) {
  return (
    <div className="border-line bg-paper shadow-soft rounded-2xl border p-4">
      <div className="text-ink-50 text-[10.5px] font-bold uppercase tracking-[0.12em]">
        Ocupação do dia
      </div>
      <div className="text-ink mb-2 mt-1.5 font-serif text-3xl leading-none">{pct}%</div>
      <div className="bg-line h-1.5 overflow-hidden rounded-full">
        {/* ponytail: width runtime, Tailwind não gera classe dinâmica */}
        <div className="bg-green-bright h-full rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <div className="text-ink-50 mt-1.5 text-[11.5px] font-medium">da agenda de hoje</div>
    </div>
  );
}

/** Faturamento de um período em curso (semana / mês) + tendência vs o mesmo ponto anterior. */
export function PeriodRevenueCard({
  label,
  sub,
  revenueCents,
  trend,
}: {
  label: string;
  sub: string;
  revenueCents: number;
  trend: Trend;
}) {
  return (
    <div className="border-line bg-paper shadow-soft rounded-2xl border p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-ink-50 text-[10.5px] font-bold uppercase tracking-[0.12em]">
          {label}
        </div>
        <TrendChip trend={trend} />
      </div>
      <div className="text-ink mt-1.5 font-serif text-3xl leading-none">{money(revenueCents)}</div>
      <div className="text-ink-50 mt-1.5 text-[11.5px] font-medium">{sub}</div>
    </div>
  );
}

/** Receita recorrente (Clube) - só quando há assinante ativo. */
export function MrrCard({ cents, activeCount }: { cents: number; activeCount: number }) {
  return (
    <Link
      href="/assinaturas-clientes"
      className="border-line bg-paper shadow-soft block rounded-2xl border p-4 no-underline transition-shadow hover:shadow-md"
    >
      <div className="text-ink-50 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em]">
        <Wallet className="size-3.5" strokeWidth={2.2} />
        Receita recorrente
      </div>
      <div className="text-ink mt-1.5 font-serif text-3xl leading-none">{money(cents)}</div>
      <div className="text-ink-50 mt-1.5 text-[11.5px] font-medium">
        {activeCount} {activeCount === 1 ? 'assinante ativo' : 'assinantes ativos'} · por mês
      </div>
    </Link>
  );
}

/** Fila de espera: quantos esperando vaga agora - só quando há alguém. */
export function FilaCard({ waiting }: { waiting: number }) {
  return (
    <Link
      href="/appointments"
      className="border-line bg-paper shadow-soft block rounded-2xl border p-4 no-underline transition-shadow hover:shadow-md"
    >
      <div className="text-ink-50 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em]">
        <Users className="size-3.5" strokeWidth={2.2} />
        Fila de espera
      </div>
      <div className="text-ink mt-1.5 font-serif text-3xl leading-none">{waiting}</div>
      <div className="text-ink-50 mt-1.5 text-[11.5px] font-medium">
        {waiting === 1 ? 'cliente esperando vaga' : 'clientes esperando vaga'}
      </div>
    </Link>
  );
}
