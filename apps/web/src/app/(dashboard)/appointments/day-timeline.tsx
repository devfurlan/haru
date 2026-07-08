'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';

import type { AppointmentStatus } from '@haru/database';

import { formatPhoneBR } from '@haru/shared';
import { cn } from '@/lib/utils';

import { deleteScheduleException } from './actions';
import type {
  CalendarAppointment,
  CalendarException,
  DayScheduleBlock,
} from './appointments-day-view';

/** Altura de uma hora na timeline, em pixels. */
const HOUR_PX = 64;
/** Altura mínima de um bloco para o conteúdo continuar legível. */
const MIN_BLOCK_PX = 28;

const STATUS_BLOCK: Record<AppointmentStatus, string> = {
  PENDING: 'border-coral bg-coral-tint text-ink hover:brightness-[.98]',
  CONFIRMED: 'border-green-bright bg-chip text-ink hover:brightness-[.98]',
  COMPLETED: 'border-edge bg-cream-2 text-ink-70 hover:brightness-[.98]',
  CANCELED: 'border-edge bg-cream-2 text-ink-30 line-through',
  NO_SHOW: 'border-coral-soft bg-coral-tint text-ink-70 hover:brightness-[.98]',
};

/** Minutos desde a meia-noite, no fuso do tenant, a partir de um ISO UTC. */
function localMinutes(iso: string, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  return h * 60 + m;
}

function minutesToLabel(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

interface PositionedAppointment {
  appt: CalendarAppointment;
  start: number; // minutos locais
  end: number; // minutos locais
}

/**
 * Empacota agendamentos sobrepostos em colunas lado a lado.
 * Retorna, por id, a coluna ocupada e o total de colunas do grupo.
 */
function computeLanes(items: PositionedAppointment[]): Map<string, { col: number; cols: number }> {
  const result = new Map<string, { col: number; cols: number }>();
  const sorted = [...items].sort((a, b) => a.start - b.start || a.end - b.end);

  let group: PositionedAppointment[] = [];
  let groupEnd = -Infinity;

  const flush = () => {
    const cols: PositionedAppointment[][] = [];
    for (const ev of group) {
      let placed = false;
      for (const col of cols) {
        if (col[col.length - 1].end <= ev.start) {
          col.push(ev);
          placed = true;
          break;
        }
      }
      if (!placed) cols.push([ev]);
    }
    const total = cols.length;
    cols.forEach((col, ci) =>
      col.forEach((ev) => result.set(ev.appt.id, { col: ci, cols: total })),
    );
    group = [];
    groupEnd = -Infinity;
  };

  for (const ev of sorted) {
    if (group.length && ev.start >= groupEnd) flush();
    group.push(ev);
    groupEnd = Math.max(groupEnd, ev.end);
  }
  if (group.length) flush();

  return result;
}

interface DayTimelineProps {
  /** Dia exibido (YYYY-MM-DD). */
  dayKey: string;
  /** Agendamentos já filtrados para este dia. */
  appointments: CalendarAppointment[];
  /** Bloqueios da agenda que tocam este dia. */
  exceptions: CalendarException[];
  /** Todos os blocos de expediente do tenant. */
  scheduleBlocks: DayScheduleBlock[];
  timezone: string;
  isToday: boolean;
  onSelect: (appt: CalendarAppointment) => void;
}

interface PositionedException {
  ex: CalendarException;
  start: number; // minutos locais (clamp em 0 se começa em dia anterior)
  end: number; // minutos locais (clamp em 1440 se termina em dia posterior)
}

export function DayTimeline({
  dayKey,
  appointments,
  exceptions,
  scheduleBlocks,
  timezone,
  isToday,
  onSelect,
}: DayTimelineProps) {
  const [isPending, startTransition] = useTransition();
  const weekday = useMemo(() => {
    const [y, m, d] = dayKey.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  }, [dayKey]);

  const positioned = useMemo<PositionedAppointment[]>(() => {
    return appointments.map((appt) => {
      const start = localMinutes(appt.startsAt, timezone);
      let end = localMinutes(appt.endsAt, timezone);
      // Guarda para durações que cruzam a meia-noite (raro): usa a duração do serviço.
      if (end <= start) end = start + appt.durationMinutes;
      return { appt, start, end };
    });
  }, [appointments, timezone]);

  // Posição dos bloqueios dentro do dia. Clamp em [0, 1440] para bloqueios que
  // entram vindos do dia anterior ou seguem para o próximo (folga/férias).
  const positionedExceptions = useMemo<PositionedException[]>(() => {
    const [y, m, d] = dayKey.split('-').map(Number);
    const dayStart = Date.UTC(y, m - 1, d);
    const dayEnd = dayStart + 24 * 60 * 60_000;
    return exceptions.map((ex) => {
      const exStartMs = new Date(ex.startsAt).getTime();
      const exEndMs = new Date(ex.endsAt).getTime();
      const start = exStartMs <= dayStart ? 0 : localMinutes(ex.startsAt, timezone);
      const end = exEndMs >= dayEnd ? 24 * 60 : localMinutes(ex.endsAt, timezone);
      return { ex, start, end: end <= start ? 24 * 60 : end };
    });
  }, [exceptions, dayKey, timezone]);

  const blocks = useMemo(
    () => scheduleBlocks.filter((b) => b.weekday === weekday),
    [scheduleBlocks, weekday],
  );

  // Faixa de horas: união do expediente do dia, dos agendamentos e dos bloqueios.
  const range = useMemo(() => {
    const starts = [
      ...blocks.map((b) => b.startMinute),
      ...positioned.map((p) => p.start),
      ...positionedExceptions.map((p) => p.start),
    ];
    const ends = [
      ...blocks.map((b) => b.endMinute),
      ...positioned.map((p) => p.end),
      ...positionedExceptions.map((p) => p.end),
    ];
    if (starts.length === 0) return null;
    const startHour = Math.floor(Math.min(...starts) / 60);
    const endHour = Math.ceil(Math.max(...ends) / 60);
    return { startHour, endHour: Math.max(endHour, startHour + 1) };
  }, [blocks, positioned, positionedExceptions]);

  const lanes = useMemo(() => computeLanes(positioned), [positioned]);

  const [nowMin, setNowMin] = useState<number | null>(null);
  useEffect(() => {
    if (!isToday) {
      setNowMin(null);
      return;
    }
    const update = () => setNowMin(localMinutes(new Date().toISOString(), timezone));
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [isToday, timezone, dayKey]);

  if (!range) {
    return (
      <div className="text-muted-foreground py-16 text-center text-sm">
        Sem expediente e sem agendamentos neste dia.
      </div>
    );
  }

  const { startHour, endHour } = range;
  const pxPerMin = HOUR_PX / 60;
  const height = (endHour - startHour) * 60 * pxPerMin;
  const hours: number[] = [];
  for (let h = startHour; h <= endHour; h++) hours.push(h);

  const showNow = nowMin !== null && nowMin >= startHour * 60 && nowMin <= endHour * 60;

  return (
    <div className="flex">
      {/* Calha das horas */}
      <div className="w-14 flex-none" aria-hidden="true" />
      {/* Área de eventos */}
      <div className="relative flex-1" style={{ height }}>
        {hours.map((h) => (
          <div
            key={h}
            className="border-border/60 absolute inset-x-0 border-t"
            style={{ top: (h - startHour) * HOUR_PX }}
          >
            <span className="text-muted-foreground absolute -left-14 -top-2.5 w-12 pr-2 text-right text-xs tabular-nums">
              {String(h).padStart(2, '0')}:00
            </span>
          </div>
        ))}

        {positionedExceptions.map((p) => {
          const top = (p.start - startHour * 60) * pxPerMin;
          const blockHeight = Math.max((p.end - p.start) * pxPerMin, MIN_BLOCK_PX);
          const label =
            p.start === 0 && p.end === 24 * 60
              ? 'Dia bloqueado'
              : `${minutesToLabel(p.start)}–${minutesToLabel(p.end)} bloqueado`;
          return (
            <div
              key={p.ex.id}
              className="absolute inset-x-0 flex items-start justify-between gap-2 overflow-hidden rounded-md border border-dashed border-zinc-300 bg-[repeating-linear-gradient(45deg,var(--color-zinc-100),var(--color-zinc-100)_8px,var(--color-zinc-50)_8px,var(--color-zinc-50)_16px)] px-2 py-1 text-xs text-zinc-500"
              style={{ top, height: blockHeight }}
            >
              <span className="truncate">
                {label}
                {p.ex.reason ? ` · ${p.ex.reason}` : ''}
              </span>
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  if (!confirm('Remover este bloqueio?')) return;
                  startTransition(() => {
                    void deleteScheduleException(p.ex.id);
                  });
                }}
                className="flex-none rounded px-1 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800 disabled:opacity-50"
              >
                Remover
              </button>
            </div>
          );
        })}

        {positioned.map((p) => {
          const lane = lanes.get(p.appt.id) ?? { col: 0, cols: 1 };
          const top = (p.start - startHour * 60) * pxPerMin;
          const blockHeight = Math.max((p.end - p.start) * pxPerMin, MIN_BLOCK_PX);
          const widthPct = 100 / lane.cols;
          const leftPct = lane.col * widthPct;
          return (
            <button
              key={p.appt.id}
              type="button"
              onClick={() => onSelect(p.appt)}
              className={cn(
                'absolute flex flex-col overflow-hidden rounded-md border-l-4 px-2 py-1 text-left text-xs shadow-sm transition-colors',
                STATUS_BLOCK[p.appt.status],
              )}
              style={{
                top,
                height: blockHeight,
                left: `calc(${leftPct}% + 2px)`,
                width: `calc(${widthPct}% - 4px)`,
              }}
            >
              <span className="truncate font-medium">
                {minutesToLabel(p.start)} · {p.appt.serviceName}
              </span>
              {blockHeight > 38 && (
                <span className="truncate opacity-80">
                  {p.appt.contactName ? `${p.appt.contactName} · ` : ''}
                  {formatPhoneBR(p.appt.contactPhone)}
                </span>
              )}
            </button>
          );
        })}

        {showNow && nowMin !== null && (
          <div
            className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
            style={{ top: (nowMin - startHour * 60) * pxPerMin }}
          >
            <span className="bg-coral -ml-1 h-2 w-2 flex-none rounded-full" />
            <span className="bg-coral h-px flex-1" />
          </div>
        )}
      </div>
    </div>
  );
}
