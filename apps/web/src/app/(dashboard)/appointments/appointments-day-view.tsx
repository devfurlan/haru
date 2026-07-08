'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';

import type { AppointmentStatus } from '@haru/database';

import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';

import { cancelAppointment, confirmAppointment } from './actions';
import { AppointmentDetailDialog } from './appointment-detail-dialog';
import { BlockTimeDialog } from './block-time-dialog';
import { DayTimeline } from './day-timeline';
import { MiniMonth } from './mini-month';

export interface CalendarAppointment {
  id: string;
  startsAt: string; // ISO UTC
  endsAt: string; // ISO UTC
  status: AppointmentStatus;
  serviceName: string;
  durationMinutes: number;
  priceCents: number;
  contactName: string | null;
  contactPhone: string | null;
  professionalId: string;
  seriesId: string | null;
}

export interface CalendarException {
  id: string;
  startsAt: string; // ISO UTC
  endsAt: string; // ISO UTC
  reason: string | null;
}

export interface DayScheduleBlock {
  weekday: number;
  startMinute: number;
  endMinute: number;
}

export interface PendingItem {
  id: string;
  timeLabel: string;
  clientName: string;
  serviceName: string;
  priceLabel: string;
  proName: string | null;
}

interface AppointmentsDayViewProps {
  appointments: CalendarAppointment[];
  exceptions: CalendarException[];
  scheduleBlocks: DayScheduleBlock[];
  professionals: { id: string; name: string }[];
  pending: PendingItem[];
  timezone: string;
  /** "Hoje" no fuso do tenant (YYYY-MM-DD). */
  today: string;
}

function localDayKey(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
}

function shiftDayKey(key: string, delta: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + delta);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function AppointmentsDayView({
  appointments,
  exceptions,
  scheduleBlocks,
  professionals,
  pending,
  timezone,
  today,
}: AppointmentsDayViewProps) {
  const [selected, setSelected] = useState(today);
  const [active, setActive] = useState<CalendarAppointment | null>(null);
  const [blocking, setBlocking] = useState(false);
  const [blockSeq, setBlockSeq] = useState(0);
  const [proFilter, setProFilter] = useState<string | null>(null); // null = todos

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarAppointment[]>();
    for (const appt of appointments) {
      const key = localDayKey(appt.startsAt, timezone);
      const list = map.get(key);
      if (list) list.push(appt);
      else map.set(key, [appt]);
    }
    for (const list of map.values()) list.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    return map;
  }, [appointments, timezone]);

  const exceptionsByDay = useMemo(() => {
    const map = new Map<string, CalendarException[]>();
    for (const ex of exceptions) {
      const firstKey = localDayKey(ex.startsAt, timezone);
      const lastKey = localDayKey(new Date(new Date(ex.endsAt).getTime() - 1).toISOString(), timezone);
      for (let key = firstKey; key <= lastKey; key = shiftDayKey(key, 1)) {
        const list = map.get(key);
        if (list) list.push(ex);
        else map.set(key, [ex]);
      }
    }
    return map;
  }, [exceptions, timezone]);

  const daysWithAppointments = useMemo(() => new Set(byDay.keys()), [byDay]);
  const dayAppointments = (byDay.get(selected) ?? []).filter(
    (a) => proFilter === null || a.professionalId === proFilter,
  );
  const dayExceptions = exceptionsByDay.get(selected) ?? [];

  const selectedLabel = useMemo(() => {
    const [y, m, d] = selected.split('-').map(Number);
    const label = new Intl.DateTimeFormat('pt-BR', {
      timeZone: timezone,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(new Date(Date.UTC(y, m - 1, d, 12)));
    return label.charAt(0).toUpperCase() + label.slice(1);
  }, [selected, timezone]);

  return (
    <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-4">
      {/* header */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-[220px] flex-1">
          <h1 className="font-serif text-[28px] tracking-tight text-ink">Agenda</h1>
          <p className="mt-1 text-sm text-ink-50">Tudo que marcaram com você, num lugar só.</p>
        </div>
        <div className="flex flex-none items-center gap-2.5">
          <Button
            variant="outline"
            onClick={() => {
              setBlockSeq((n) => n + 1);
              setBlocking(true);
            }}
          >
            Bloquear horário
          </Button>
          <Button asChild variant="coral">
            <Link href="/appointments/new">Novo agendamento</Link>
          </Button>
        </div>
      </div>

      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 rounded-full border border-edge bg-paper p-1">
          <button
            type="button"
            aria-label="Dia anterior"
            onClick={() => setSelected((s) => shiftDayKey(s, -1))}
            className="flex size-7 items-center justify-center rounded-full text-ink-70 hover:bg-cream-2"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="px-1.5 font-serif text-sm text-ink">{selectedLabel}</span>
          <button
            type="button"
            aria-label="Próximo dia"
            onClick={() => setSelected((s) => shiftDayKey(s, 1))}
            className="flex size-7 items-center justify-center rounded-full text-ink-70 hover:bg-cream-2"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => setSelected(today)}
          disabled={selected === today}
          className="rounded-full border border-edge bg-paper px-4 py-2.5 text-xs font-semibold text-ink-70 hover:bg-cream-2 disabled:opacity-50"
        >
          Hoje
        </button>
        <div className="flex-1" />
        {professionals.length > 1 && (
          <div className="flex flex-wrap items-center gap-2">
            <Chip selected={proFilter === null} onClick={() => setProFilter(null)}>
              Todos
            </Chip>
            {professionals.map((p) => (
              <Chip
                key={p.id}
                dot
                selected={proFilter === p.id}
                onClick={() => setProFilter(p.id)}
              >
                {p.name.split(/\s+/)[0]}
              </Chip>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-start gap-4">
        {/* grade */}
        <div className="min-w-0 flex-1 overflow-hidden rounded-[18px] border border-line bg-paper p-4 shadow-soft">
          <div className="max-h-[34rem] overflow-y-auto pt-2">
            <DayTimeline
              dayKey={selected}
              appointments={dayAppointments}
              exceptions={dayExceptions}
              scheduleBlocks={scheduleBlocks}
              timezone={timezone}
              isToday={selected === today}
              onSelect={setActive}
            />
          </div>
        </div>

        {/* trilho direito */}
        <div className="flex w-[300px] flex-none flex-col gap-4">
          {pending.length > 0 && <PendingPanel pending={pending} />}
          <div className="rounded-[18px] border border-line bg-paper p-4 shadow-soft">
            <MiniMonth
              selected={selected}
              today={today}
              daysWithAppointments={daysWithAppointments}
              timezone={timezone}
              onSelect={setSelected}
            />
          </div>
        </div>
      </div>

      <AppointmentDetailDialog
        appointment={active}
        timezone={timezone}
        onClose={() => setActive(null)}
      />
      <BlockTimeDialog
        key={blockSeq}
        open={blocking}
        defaultDate={selected}
        onClose={() => setBlocking(false)}
        onCreated={() => setBlocking(false)}
      />
    </div>
  );
}

function PendingPanel({ pending }: { pending: PendingItem[] }) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();

  function act(fn: () => Promise<unknown>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  return (
    <div className="rounded-[18px] border border-coral-tint bg-paper p-4 shadow-soft">
      <div className="mb-1 flex items-center gap-2 font-serif text-base text-ink">
        Pendentes
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-coral px-1.5 text-[11px] font-bold text-white">
          {pending.length}
        </span>
      </div>
      <p className="mb-1.5 text-[11.5px] text-ink-50">Pedidos da página pública esperando o seu ok.</p>
      {pending.map((p) => (
        <div key={p.id} className="border-t border-dotted border-edge py-2.5">
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-sm text-ink">{p.timeLabel}</span>
            <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-ink">
              {p.clientName}
            </span>
            {p.proName && <span className="text-[11px] font-medium text-ink-50">{p.proName}</span>}
          </div>
          <div className="mb-2 mt-0.5 text-[11.5px] text-ink-50">
            {p.serviceName} · {p.priceLabel}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => act(() => confirmAppointment(p.id))}
              className="flex-1 rounded-full bg-green-deep px-2 py-2 text-[11.5px] font-semibold text-cream disabled:opacity-50"
            >
              Confirmar
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (!confirm('Recusar este pedido?')) return;
                act(() => cancelAppointment(p.id, { notifyClient: true }));
              }}
              className="flex-1 rounded-full border border-edge px-2 py-2 text-[11.5px] font-semibold text-ink-70 hover:bg-cream-2 disabled:opacity-50"
            >
              Recusar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
