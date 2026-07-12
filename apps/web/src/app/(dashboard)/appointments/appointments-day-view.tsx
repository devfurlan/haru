'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';

import type { AppointmentStatus } from '@haru/database';

import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';

import { cancelAppointment, confirmAppointment } from './actions';
import { AppointmentDetailCard } from './appointment-detail-card';
import { BlockTimeDialog } from './block-time-dialog';
import { DayGrid } from './day-grid';
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
  /** Folga de um profissional específico; null = estabelecimento inteiro. */
  professionalId: string | null;
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

/** Uma coluna da grade (profissional visível). */
export interface GridProfessional {
  id: string;
  name: string;
  color: string;
  meta?: string;
}

/** Cores por profissional (ponto do chip + borda do avatar na coluna). */
const PRO_COLORS = ['#2FD37A', '#C9A24B', '#FF5A36', '#3B82F6', '#A855F7', '#EC4899', '#14B8A6'];

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

  const multiPro = professionals.length > 1;
  const colorOf = (id: string) =>
    PRO_COLORS[professionals.findIndex((p) => p.id === id) % PRO_COLORS.length];

  // Selecionar outro dia/filtro fecha o detalhe (ele pode não estar mais visível).
  const goToDay = (day: string) => {
    setSelected(day);
    setActive(null);
  };

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
      const lastKey = localDayKey(
        new Date(new Date(ex.endsAt).getTime() - 1).toISOString(),
        timezone,
      );
      for (let key = firstKey; key <= lastKey; key = shiftDayKey(key, 1)) {
        const list = map.get(key);
        if (list) list.push(ex);
        else map.set(key, [ex]);
      }
    }
    return map;
  }, [exceptions, timezone]);

  const daysWithAppointments = useMemo(() => new Set(byDay.keys()), [byDay]);
  const dayApptsAll = byDay.get(selected) ?? [];
  const gridAppts =
    proFilter === null ? dayApptsAll : dayApptsAll.filter((a) => a.professionalId === proFilter);
  const dayExceptions = exceptionsByDay.get(selected) ?? [];

  // Colunas da grade: solo (≤1 prof) usa coluna única sem cabeçalho; multi mostra
  // uma coluna por profissional (ou só a selecionada pelo chip).
  const columns: GridProfessional[] = useMemo(() => {
    if (!multiPro) return [];
    const list =
      proFilter === null ? professionals : professionals.filter((p) => p.id === proFilter);
    return list.map((p) => {
      const n = dayApptsAll.filter((a) => a.professionalId === p.id).length;
      return {
        id: p.id,
        name: p.name,
        color: colorOf(p.id),
        meta: n === 0 ? 'livre' : `${n} no dia`,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [multiPro, proFilter, professionals, dayApptsAll]);

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

  const professionalName = active
    ? (professionals.find((p) => p.id === active.professionalId)?.name ?? null)
    : null;

  return (
    <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-4">
      {/* header */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-[220px] flex-1">
          <h1 className="text-ink font-serif text-[28px] tracking-tight">Agenda</h1>
          <p className="text-ink-50 mt-1 text-sm">Tudo que marcaram com você, num lugar só.</p>
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
        <div className="border-edge bg-paper flex items-center gap-1.5 rounded-full border p-1">
          <button
            type="button"
            aria-label="Dia anterior"
            onClick={() => goToDay(shiftDayKey(selected, -1))}
            className="text-ink-70 hover:bg-cream-2 flex size-[30px] items-center justify-center rounded-full"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="text-ink px-1.5 font-serif text-sm">{selectedLabel}</span>
          <button
            type="button"
            aria-label="Próximo dia"
            onClick={() => goToDay(shiftDayKey(selected, 1))}
            className="text-ink-70 hover:bg-cream-2 flex size-[30px] items-center justify-center rounded-full"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => goToDay(today)}
          disabled={selected === today}
          className="border-edge bg-paper text-ink-70 hover:bg-cream-2 rounded-full border px-4 py-2.5 text-xs font-semibold disabled:opacity-50"
        >
          Hoje
        </button>
        <div className="flex-1" />
        {multiPro && (
          <div className="flex flex-wrap items-center gap-2">
            <Chip selected={proFilter === null} onClick={() => setProFilter(null)}>
              Todos
            </Chip>
            {professionals.map((p) => (
              <Chip
                key={p.id}
                dot
                dotColor={colorOf(p.id)}
                selected={proFilter === p.id}
                onClick={() => setProFilter((cur) => (cur === p.id ? null : p.id))}
              >
                {p.name.split(/\s+/)[0]}
              </Chip>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-start gap-4">
        {/* grade */}
        <div className="border-line bg-paper shadow-soft min-w-0 flex-1 overflow-hidden rounded-[18px] border">
          <div className="max-h-[40rem] overflow-y-auto">
            <DayGrid
              dayKey={selected}
              appointments={gridAppts}
              exceptions={dayExceptions}
              scheduleBlocks={scheduleBlocks}
              columns={columns}
              timezone={timezone}
              isToday={selected === today}
              selectedId={active?.id ?? null}
              onSelect={setActive}
            />
          </div>
        </div>

        {/* trilho direito */}
        <div className="flex w-[320px] max-w-full flex-none flex-col gap-3.5">
          {active && (
            <AppointmentDetailCard
              appointment={active}
              professionalName={multiPro ? professionalName : null}
              timezone={timezone}
              onClose={() => setActive(null)}
            />
          )}
          {pending.length > 0 && <PendingPanel pending={pending} />}
          <div className="border-line bg-paper shadow-soft rounded-[18px] border p-4">
            <MiniMonth
              selected={selected}
              today={today}
              daysWithAppointments={daysWithAppointments}
              timezone={timezone}
              onSelect={goToDay}
            />
          </div>
        </div>
      </div>

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
    <div className="border-coral-tint bg-paper shadow-soft rounded-[18px] border p-4">
      <div className="text-ink mb-1 flex items-center gap-2 font-serif text-base">
        Pendentes
        <span className="bg-coral inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white">
          {pending.length}
        </span>
      </div>
      <p className="text-ink-50 mb-1.5 text-[11.5px]">
        Pedidos da página pública esperando o seu ok.
      </p>
      {pending.map((p) => (
        <div key={p.id} className="border-edge border-t border-dotted py-2.5">
          <div className="flex items-baseline gap-2">
            <span className="text-ink font-serif text-sm">{p.timeLabel}</span>
            <span className="text-ink min-w-0 flex-1 truncate text-[12.5px] font-semibold">
              {p.clientName}
            </span>
            {p.proName && <span className="text-ink-50 text-[11px] font-medium">{p.proName}</span>}
          </div>
          <div className="text-ink-50 mb-2 mt-0.5 text-[11.5px]">
            {p.serviceName} · {p.priceLabel}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => act(() => confirmAppointment(p.id))}
              className="bg-green-deep text-cream flex-1 rounded-full px-2 py-2 text-[11.5px] font-semibold disabled:opacity-50"
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
              className="border-edge text-ink-70 hover:bg-cream-2 flex-1 rounded-full border px-2 py-2 text-[11.5px] font-semibold disabled:opacity-50"
            >
              Recusar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
