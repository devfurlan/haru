'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { AppointmentStatus } from '@haru/database';

import { Button } from '@/components/ui/button';

import { AppointmentDetailDialog } from './appointment-detail-dialog';
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
  contactPhone: string;
  seriesId: string | null;
}

export interface DayScheduleBlock {
  weekday: number;
  startMinute: number;
  endMinute: number;
}

interface AppointmentsDayViewProps {
  appointments: CalendarAppointment[];
  scheduleBlocks: DayScheduleBlock[];
  timezone: string;
  /** "Hoje" no fuso do tenant (YYYY-MM-DD). */
  today: string;
}

/** Chave YYYY-MM-DD do agendamento no fuso do tenant. */
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
  scheduleBlocks,
  timezone,
  today,
}: AppointmentsDayViewProps) {
  const [selected, setSelected] = useState(today);
  const [active, setActive] = useState<CalendarAppointment | null>(null);

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

  const daysWithAppointments = useMemo(() => new Set(byDay.keys()), [byDay]);
  const dayAppointments = byDay.get(selected) ?? [];

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
    <div className="bg-card rounded-lg border p-4 shadow-sm md:flex md:gap-6 md:divide-x">
      {/* Timeline do dia */}
      <div className="min-w-0 md:flex-1 md:pr-6">
        <div className="flex items-center gap-3">
          <h2 className="flex-auto text-sm font-semibold">{selectedLabel}</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSelected(today)}
            disabled={selected === today}
          >
            Hoje
          </Button>
          <div className="flex flex-none items-center">
            <button
              type="button"
              onClick={() => setSelected((s) => shiftDayKey(s, -1))}
              className="text-muted-foreground hover:bg-accent hover:text-foreground flex items-center justify-center rounded-md p-1.5"
            >
              <span className="sr-only">Dia anterior</span>
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setSelected((s) => shiftDayKey(s, 1))}
              className="text-muted-foreground hover:bg-accent hover:text-foreground flex items-center justify-center rounded-md p-1.5"
            >
              <span className="sr-only">Próximo dia</span>
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="mt-4 max-h-[32rem] overflow-y-auto">
          <DayTimeline
            dayKey={selected}
            appointments={dayAppointments}
            scheduleBlocks={scheduleBlocks}
            timezone={timezone}
            isToday={selected === today}
            onSelect={setActive}
          />
        </div>
      </div>

      {/* Mini-calendário do mês */}
      <div className="order-first mb-6 md:order-none md:mb-0 md:w-64 md:flex-none md:pl-6">
        <MiniMonth
          selected={selected}
          today={today}
          daysWithAppointments={daysWithAppointments}
          timezone={timezone}
          onSelect={setSelected}
        />
      </div>

      <AppointmentDetailDialog
        appointment={active}
        timezone={timezone}
        onClose={() => setActive(null)}
      />
    </div>
  );
}
