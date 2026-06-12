'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { cn } from '@/lib/utils';

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function dayKey(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

interface MiniMonthProps {
  /** Dia selecionado (YYYY-MM-DD). */
  selected: string;
  /** "Hoje" no fuso do tenant (YYYY-MM-DD). */
  today: string;
  /** Conjunto de dias (YYYY-MM-DD) que possuem agendamentos. */
  daysWithAppointments: Set<string>;
  timezone: string;
  onSelect: (day: string) => void;
}

export function MiniMonth({
  selected,
  today,
  daysWithAppointments,
  timezone,
  onSelect,
}: MiniMonthProps) {
  const [selY, selM] = selected.split('-').map(Number);
  const [viewYear, setViewYear] = useState(selY);
  const [viewMonth, setViewMonth] = useState(selM - 1); // 0-indexed

  // Sincroniza o mês exibido quando o dia selecionado muda de mês
  // (ex.: navegação por dia que cruza a virada de mês).
  useEffect(() => {
    const [y, m] = selected.split('-').map(Number);
    setViewYear(y);
    setViewMonth(m - 1);
  }, [selected]);

  // Monta a grade do mês (semana começando no domingo, como Date#getDay).
  const cells = useMemo(() => {
    const firstWeekday = new Date(Date.UTC(viewYear, viewMonth, 1)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();
    const daysInPrevMonth = new Date(Date.UTC(viewYear, viewMonth, 0)).getUTCDate();

    const result: { key: string; day: number; currentMonth: boolean }[] = [];

    for (let i = firstWeekday - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const m = viewMonth === 0 ? 11 : viewMonth - 1;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      result.push({ key: dayKey(y, m, day), day, currentMonth: false });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      result.push({ key: dayKey(viewYear, viewMonth, day), day, currentMonth: true });
    }
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
    <div>
      <div className="flex items-center">
        <h2 className="flex-auto text-sm font-semibold">{monthLabel}</h2>
        <button
          type="button"
          onClick={goToPrevMonth}
          className="text-muted-foreground hover:bg-accent hover:text-foreground -my-1.5 flex flex-none items-center justify-center rounded-md p-1.5"
        >
          <span className="sr-only">Mês anterior</span>
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={goToNextMonth}
          className="text-muted-foreground hover:bg-accent hover:text-foreground -my-1.5 -mr-1.5 ml-2 flex flex-none items-center justify-center rounded-md p-1.5"
        >
          <span className="sr-only">Próximo mês</span>
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div className="text-muted-foreground mt-4 grid grid-cols-7 text-center text-xs leading-6">
        {WEEKDAYS.map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 text-sm">
        {cells.map((cell, idx) => {
          const isSelected = cell.key === selected;
          const isToday = cell.key === today;
          const hasAppointments = daysWithAppointments.has(cell.key);
          return (
            <div key={`${cell.key}-${idx}`} className="py-0.5">
              <button
                type="button"
                onClick={() => onSelect(cell.key)}
                className={cn(
                  'relative mx-auto flex h-8 w-8 items-center justify-center rounded-full',
                  !isSelected && !isToday && !cell.currentMonth && 'text-muted-foreground/50',
                  !isSelected && !isToday && cell.currentMonth && 'text-foreground',
                  !isSelected && 'hover:bg-accent',
                  isToday && !isSelected && 'text-primary font-semibold',
                  isSelected && 'text-primary-foreground font-semibold',
                  isSelected && !isToday && 'bg-foreground',
                  isSelected && isToday && 'bg-primary',
                )}
              >
                <time dateTime={cell.key}>{cell.day}</time>
                {hasAppointments && (
                  <span
                    className={cn(
                      'absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full',
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
  );
}
