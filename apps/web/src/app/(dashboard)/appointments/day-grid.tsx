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
  GridProfessional,
} from './appointments-day-view';

/** Altura de uma hora na grade, em pixels. */
const HOUR_PX = 64;
/** Altura mínima de um bloco para o conteúdo continuar legível. */
const MIN_BLOCK_PX = 28;
/** Gutter à esquerda para as horas (px). */
const GUTTER_PX = 64;
/** Respiro vertical no topo/base para o rótulo da 1ª/última hora não ser cortado. */
const PAD_Y = 12;

/** Estilo do bloco por status: fundo suave + borda esquerda colorida. */
const STATUS_BLOCK: Record<AppointmentStatus, { bg: string; bar: string; muted?: boolean }> = {
  PENDING: { bg: 'var(--coral-tint)', bar: 'var(--coral)' },
  CONFIRMED: { bg: 'var(--green-tint)', bar: 'var(--green)' },
  COMPLETED: { bg: 'var(--cream-2, #f3edde)', bar: 'var(--edge)', muted: true },
  CANCELED: { bg: 'var(--cream-2, #f3edde)', bar: 'var(--edge)', muted: true },
  NO_SHOW: { bg: 'var(--coral-tint)', bar: 'var(--coral-soft)', muted: true },
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

function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.trim().slice(0, 2).toUpperCase();
}

interface PositionedAppointment {
  appt: CalendarAppointment;
  start: number; // minutos locais
  end: number; // minutos locais
}

/**
 * Empacota agendamentos sobrepostos de UMA coluna (mesmo profissional) em
 * sub-colunas lado a lado. Retorna, por id, a sub-coluna ocupada e o total.
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

interface PositionedException {
  ex: CalendarException;
  start: number; // minutos locais (clamp em 0 se começa em dia anterior)
  end: number; // minutos locais (clamp em 1440 se termina em dia posterior)
}

interface DayGridProps {
  /** Dia exibido (YYYY-MM-DD). */
  dayKey: string;
  /** Agendamentos já filtrados para este dia (e pelo profissional, se houver). */
  appointments: CalendarAppointment[];
  /** Bloqueios da agenda que tocam este dia. */
  exceptions: CalendarException[];
  /** Todos os blocos de expediente do tenant. */
  scheduleBlocks: DayScheduleBlock[];
  /** Colunas a renderizar (profissionais visíveis). Vazio = coluna única. */
  columns: GridProfessional[];
  timezone: string;
  isToday: boolean;
  selectedId: string | null;
  onSelect: (appt: CalendarAppointment) => void;
}

export function DayGrid({
  dayKey,
  appointments,
  exceptions,
  scheduleBlocks,
  columns,
  timezone,
  isToday,
  selectedId,
  onSelect,
}: DayGridProps) {
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

  // Colunas: uma por profissional visível; sem profissionais, uma coluna "geral".
  const cols: GridProfessional[] =
    columns.length > 0 ? columns : [{ id: '__all__', name: '', color: 'var(--green)' }];
  const singleGeneric = columns.length === 0;
  const visibleIds = new Set(columns.map((c) => c.id));

  const apptsByCol = useMemo(() => {
    const map = new Map<string, PositionedAppointment[]>();
    for (const c of cols) map.set(c.id, []);
    for (const p of positioned) {
      const key = singleGeneric
        ? '__all__'
        : map.has(p.appt.professionalId)
          ? p.appt.professionalId
          : cols[0].id; // fallback: profissional fora da lista visível
      map.get(key)!.push(p);
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positioned, columns, singleGeneric]);

  // Bloqueios globais (estabelecimento) x por-profissional visível.
  const globalExceptions = positionedExceptions.filter((p) => p.ex.professionalId === null);
  const proExceptions = positionedExceptions.filter(
    (p) => p.ex.professionalId !== null && (singleGeneric || visibleIds.has(p.ex.professionalId)),
  );

  if (!range) {
    return (
      <div className="text-ink-50 py-16 text-center text-sm">
        Sem expediente e sem agendamentos neste dia.
      </div>
    );
  }

  const { startHour, endHour } = range;
  const pxPerMin = HOUR_PX / 60;
  const height = (endHour - startHour) * 60 * pxPerMin + PAD_Y * 2;
  const hours: number[] = [];
  for (let h = startHour; h <= endHour; h++) hours.push(h);

  const showNow = nowMin !== null && nowMin >= startHour * 60 && nowMin <= endHour * 60;
  const dayEmpty = positioned.length === 0;

  const topOf = (min: number) => PAD_Y + (min - startHour * 60) * pxPerMin;
  const heightOf = (start: number, end: number) => Math.max((end - start) * pxPerMin, MIN_BLOCK_PX);

  function RemoveBtn({ id }: { id: string }) {
    return (
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          if (!confirm('Remover este bloqueio?')) return;
          startTransition(() => {
            void deleteScheduleException(id);
          });
        }}
        className="text-ink-50 hover:text-ink-70 flex-none rounded px-1 hover:bg-black/5 disabled:opacity-50"
      >
        Desbloquear
      </button>
    );
  }

  function ExceptionBand({ p }: { p: PositionedException }) {
    const label =
      p.start === 0 && p.end === 24 * 60
        ? 'Dia bloqueado'
        : `${minutesToLabel(p.start)}–${minutesToLabel(p.end)} bloqueado`;
    return (
      <div
        className="border-ink-30/60 text-ink-50 absolute inset-x-1 flex items-start justify-between gap-2 overflow-hidden rounded-md border border-dashed bg-[repeating-linear-gradient(45deg,#0000000a,#0000000a_8px,#00000000_8px,#00000000_16px)] px-2 py-1 text-[11px]"
        style={{ top: topOf(p.start), height: heightOf(p.start, p.end) }}
      >
        <span className="truncate">
          {label}
          {p.ex.reason ? ` · ${p.ex.reason}` : ''}
        </span>
        <RemoveBtn id={p.ex.id} />
      </div>
    );
  }

  return (
    <div>
      {/* cabeçalho das colunas (profissionais) */}
      {!singleGeneric && (
        <div className="border-line flex border-b" style={{ paddingLeft: GUTTER_PX }}>
          {cols.map((c) => (
            <div
              key={c.id}
              className="border-line/60 flex min-w-0 flex-1 items-center gap-2.5 border-l px-3.5 py-3"
            >
              <div
                className="text-green-emph size-7.5 flex flex-none items-center justify-center rounded-[10px] bg-[var(--green-tint)] font-serif text-[11.5px] font-semibold"
                style={{ border: `2px solid ${c.color}` }}
              >
                {initialsOf(c.name)}
              </div>
              <div className="min-w-0">
                <div className="text-ink truncate text-[13.5px] font-semibold leading-tight">
                  {c.name}
                </div>
                <div className="text-ink-50 text-[11px] font-medium leading-tight">{c.meta}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* corpo */}
      <div className="relative" style={{ height }}>
        {/* linhas de hora + rótulos no gutter */}
        {hours.map((h) => (
          <div key={h}>
            <div
              className="border-line/60 absolute right-0 border-t"
              style={{ top: topOf(h * 60), left: GUTTER_PX }} // ponytail: runtime, Tailwind não gera
            />
            <span
              className="text-ink-30 absolute left-0 w-14 pr-2 text-right text-[11px] font-semibold tabular-nums leading-none"
              style={{ top: topOf(h * 60) - 4 }} // ponytail: runtime, Tailwind não gera
            >
              {String(h).padStart(2, '0')}:00
            </span>
          </div>
        ))}

        {/* bloqueios globais (estabelecimento) — faixa em todas as colunas */}
        <div className="absolute inset-y-0 right-0" style={{ left: GUTTER_PX }}>
          {globalExceptions.map((p) => (
            <ExceptionBand key={p.ex.id} p={p} />
          ))}
        </div>

        {/* colunas */}
        <div className="absolute inset-y-0 right-0 flex" style={{ left: GUTTER_PX }}>
          {cols.map((c) => {
            const colAppts = apptsByCol.get(c.id) ?? [];
            const lanes = computeLanes(colAppts);
            const colExceptions = proExceptions.filter(
              (p) => singleGeneric || p.ex.professionalId === c.id,
            );
            return (
              <div key={c.id} className="border-line/60 relative min-w-0 flex-1 border-l">
                {colExceptions.map((p) => (
                  <ExceptionBand key={p.ex.id} p={p} />
                ))}
                {colAppts.map((p) => {
                  const lane = lanes.get(p.appt.id) ?? { col: 0, cols: 1 };
                  const blockH = heightOf(p.start, p.end);
                  const widthPct = 100 / lane.cols;
                  const leftPct = lane.col * widthPct;
                  const s = STATUS_BLOCK[p.appt.status];
                  const selected = p.appt.id === selectedId;
                  const client =
                    p.appt.contactName ?? formatPhoneBR(p.appt.contactPhone) ?? 'Cliente';
                  return (
                    <button
                      key={p.appt.id}
                      type="button"
                      onClick={() => onSelect(p.appt)}
                      className={cn(
                        'absolute overflow-hidden rounded-[10px] px-2 py-1 text-left transition hover:brightness-[.98]',
                        s.muted && 'opacity-70',
                        selected && 'shadow-[0_0_0_2px_var(--color-green-deep)]',
                      )}
                      // ponytail: runtime, Tailwind não gera
                      style={{
                        top: topOf(p.start),
                        height: blockH,
                        left: `calc(${leftPct}% + 5px)`,
                        width: `calc(${widthPct}% - 10px)`,
                        background: s.bg,
                        borderLeft: `3px solid ${s.bar}`,
                      }}
                    >
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-ink font-serif text-[11.5px] font-semibold leading-tight">
                          {minutesToLabel(p.start)}
                        </span>
                        <span className="text-ink truncate text-[12px] font-semibold leading-tight">
                          {client}
                        </span>
                      </div>
                      {blockH > 38 && (
                        <div className="text-ink-50 truncate text-[10.5px] font-medium leading-snug">
                          {p.appt.serviceName}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* estado vazio */}
        {dayEmpty && (
          <div
            className="absolute inset-y-0 right-0 z-[6] flex items-start justify-center bg-[rgba(250,245,234,.55)] pt-[120px]"
            style={{ left: GUTTER_PX }}
          >
            <div className="border-edge bg-paper shadow-soft max-w-[360px] rounded-[20px] border border-dashed px-7 py-8 text-center">
              <div className="text-green-emph size-12.5 mx-auto mb-3 flex items-center justify-center rounded-[15px] bg-[var(--green-tint)]">
                <svg
                  width="23"
                  height="23"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="5" width="18" height="16" rx="3" />
                  <path d="M3 10h18M8 3v4M16 3v4" />
                </svg>
              </div>
              <div className="text-ink font-serif text-xl">
                Tá tudo <em className="text-green-emph italic not-italic">livre</em> por aqui
              </div>
              <p className="text-ink-50 mt-1.5 text-[13px]">
                Nenhum horário neste dia. Marcou pelo app ou pela página, aparece aqui.
              </p>
            </div>
          </div>
        )}

        {/* linha do agora */}
        {showNow && nowMin !== null && (
          <div
            className="border-coral pointer-events-none absolute right-0 z-[5] border-t-2"
            style={{ left: GUTTER_PX, top: topOf(nowMin) }} // ponytail: runtime, Tailwind não gera
          >
            <span className="bg-coral -left-14.5 absolute -top-[9px] rounded-full px-1.5 py-1 text-[10px] font-bold leading-none text-white">
              {minutesToLabel(nowMin)}
            </span>
            <span className="bg-coral absolute -left-[5px] -top-[5px] size-2 rounded-full" />
          </div>
        )}
      </div>
    </div>
  );
}
