'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';

import { cn } from '@/lib/utils';

export interface CalendarAppointment {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  serviceName: string;
  contactName: string | null;
  contactPhone: string;
}

interface AppointmentsCalendarProps {
  appointments: CalendarAppointment[];
  timezone: string;
  /** Data de "hoje" no fuso do tenant, no formato YYYY-MM-DD. */
  today: string;
}

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const STATUS_DOT: Record<string, string> = {
  PENDING: 'bg-amber-500',
  CONFIRMED: 'bg-emerald-500',
  CANCELED: 'bg-zinc-400',
  COMPLETED: 'bg-blue-500',
  NO_SHOW: 'bg-rose-500',
};

/** Chave YYYY-MM-DD do agendamento no fuso do tenant. */
function localDayKey(iso: string, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
  return parts; // en-CA já entrega YYYY-MM-DD
}

function formatTime(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function dayKey(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

export function AppointmentsCalendar({ appointments, timezone, today }: AppointmentsCalendarProps) {
  const [todayY, todayM, todayD] = today.split('-').map(Number);

  const [viewYear, setViewYear] = useState(todayY);
  const [viewMonth, setViewMonth] = useState(todayM - 1); // 0-indexed
  const [selected, setSelected] = useState(today);

  // Agrupa agendamentos por dia local (YYYY-MM-DD).
  const byDay = useMemo(() => {
    const map = new Map<string, CalendarAppointment[]>();
    for (const appt of appointments) {
      const key = localDayKey(appt.startsAt, timezone);
      const list = map.get(key);
      if (list) list.push(appt);
      else map.set(key, [appt]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    }
    return map;
  }, [appointments, timezone]);

  // Monta a grade do mês (semana começando no domingo, como Date#getDay).
  const cells = useMemo(() => {
    const firstWeekday = new Date(Date.UTC(viewYear, viewMonth, 1)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();
    const daysInPrevMonth = new Date(Date.UTC(viewYear, viewMonth, 0)).getUTCDate();

    const result: { key: string; day: number; currentMonth: boolean }[] = [];

    // Dias do mês anterior para preencher o início.
    for (let i = firstWeekday - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const m = viewMonth === 0 ? 11 : viewMonth - 1;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      result.push({ key: dayKey(y, m, day), day, currentMonth: false });
    }
    // Dias do mês atual.
    for (let day = 1; day <= daysInMonth; day++) {
      result.push({ key: dayKey(viewYear, viewMonth, day), day, currentMonth: true });
    }
    // Dias do próximo mês até completar a última semana.
    const remainder = result.length % 7;
    if (remainder !== 0) {
      const m = viewMonth === 11 ? 0 : viewMonth + 1;
      const y = viewMonth === 11 ? viewYear + 1 : viewYear;
      for (let day = 1; result.length % 7 !== 0; day++) {
        result.push({ key: dayKey(y, m, day), day, currentMonth: false });
      }
    }
    return result;
  }, [viewYear, viewMonth]);

  const monthLabel = useMemo(() => {
    const label = new Intl.DateTimeFormat('pt-BR', {
      timeZone: timezone,
      month: 'long',
      year: 'numeric',
    }).format(new Date(Date.UTC(viewYear, viewMonth, 15, 12)));
    return label.charAt(0).toUpperCase() + label.slice(1);
  }, [viewYear, viewMonth, timezone]);

  const selectedLabel = useMemo(() => {
    const [y, m, d] = selected.split('-').map(Number);
    const label = new Intl.DateTimeFormat('pt-BR', {
      timeZone: timezone,
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    }).format(new Date(Date.UTC(y, m - 1, d, 12)));
    return label.charAt(0).toUpperCase() + label.slice(1);
  }, [selected, timezone]);

  const selectedAppointments = byDay.get(selected) ?? [];

  function goToPrevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function goToNextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm md:grid md:grid-cols-2 md:gap-8 md:divide-x">
      {/* Calendário do mês */}
      <div className="md:pr-8">
        <div className="flex items-center">
          <h2 className="flex-auto text-sm font-semibold">{monthLabel}</h2>
          <button
            type="button"
            onClick={goToPrevMonth}
            className="-my-1.5 flex flex-none items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <span className="sr-only">Mês anterior</span>
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={goToNextMonth}
            className="-my-1.5 -mr-1.5 ml-2 flex flex-none items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <span className="sr-only">Próximo mês</span>
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-6 grid grid-cols-7 text-center text-xs leading-6 text-muted-foreground">
          {WEEKDAYS.map((d, i) => (
            <div key={i}>{d}</div>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-7 text-sm">
          {cells.map((cell, idx) => {
            const isSelected = cell.key === selected;
            const isToday = cell.key === today;
            const hasAppointments = byDay.has(cell.key);
            return (
              <div key={`${cell.key}-${idx}`} className="py-1">
                <button
                  type="button"
                  onClick={() => setSelected(cell.key)}
                  className={cn(
                    'relative mx-auto flex h-9 w-9 items-center justify-center rounded-full',
                    !isSelected && !isToday && !cell.currentMonth && 'text-muted-foreground/50',
                    !isSelected && !isToday && cell.currentMonth && 'text-foreground',
                    !isSelected && 'hover:bg-accent',
                    isToday && !isSelected && 'font-semibold text-primary',
                    isSelected && 'font-semibold text-primary-foreground',
                    isSelected && !isToday && 'bg-foreground',
                    isSelected && isToday && 'bg-primary',
                  )}
                >
                  <time dateTime={cell.key}>{cell.day}</time>
                  {hasAppointments && (
                    <span
                      className={cn(
                        'absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full',
                        isSelected ? 'bg-primary-foreground' : 'bg-primary',
                      )}
                    />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Agenda do dia selecionado */}
      <section className="mt-8 md:mt-0 md:pl-8">
        <h2 className="text-sm font-semibold">
          Agenda de <span className="text-foreground">{selectedLabel}</span>
        </h2>
        {selectedAppointments.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Nenhum agendamento neste dia.</p>
        ) : (
          <ol className="mt-4 flex flex-col gap-y-1 text-sm">
            {selectedAppointments.map((appt) => (
              <li
                key={appt.id}
                className="flex items-center gap-x-3 rounded-lg px-3 py-2 hover:bg-accent"
              >
                <span
                  className={cn(
                    'h-2 w-2 flex-none rounded-full',
                    STATUS_DOT[appt.status] ?? 'bg-zinc-400',
                  )}
                  aria-hidden="true"
                />
                <div className="flex-auto">
                  <p className="font-medium text-foreground">{appt.serviceName}</p>
                  <p className="text-muted-foreground">
                    {appt.contactName ? `${appt.contactName} · ` : ''}
                    {appt.contactPhone}
                  </p>
                </div>
                <time
                  dateTime={appt.startsAt}
                  className="flex-none font-medium tabular-nums text-muted-foreground"
                >
                  {formatTime(appt.startsAt, timezone)}
                </time>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
