'use client';

import { Repeat } from 'lucide-react';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { STATUS_LABEL, STATUS_STYLE } from '@/lib/appointment-status';
import { formatPhoneBR } from '@/lib/format';
import { cn } from '@/lib/utils';

import { AppointmentActions } from './appointment-actions';
import type { CalendarAppointment } from './appointments-day-view';

function formatTime(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function formatBRL(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${m}min`;
}

interface AppointmentDetailDialogProps {
  appointment: CalendarAppointment | null;
  timezone: string;
  onClose: () => void;
}

export function AppointmentDetailDialog({
  appointment,
  timezone,
  onClose,
}: AppointmentDetailDialogProps) {
  return (
    <Dialog
      open={appointment !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        {appointment && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">{appointment.serviceName}</DialogTitle>
              <p className="text-muted-foreground text-sm">
                {formatTime(appointment.startsAt, timezone)}–
                {formatTime(appointment.endsAt, timezone)} ·{' '}
                {formatDuration(appointment.durationMinutes)} · {formatBRL(appointment.priceCents)}
              </p>
            </DialogHeader>

            <div className="space-y-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'rounded px-1.5 py-0.5 text-xs font-medium',
                    STATUS_STYLE[appointment.status] ?? '',
                  )}
                >
                  {STATUS_LABEL[appointment.status] ?? appointment.status}
                </span>
                {appointment.seriesId && (
                  <span className="bg-muted text-muted-foreground inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium">
                    <Repeat className="h-3 w-3" aria-hidden="true" />
                    Recorrente
                  </span>
                )}
              </div>
              {appointment.contactName && (
                <p className="text-foreground font-medium">{appointment.contactName}</p>
              )}
              <p className="text-muted-foreground">{formatPhoneBR(appointment.contactPhone)}</p>
            </div>

            <AppointmentActions
              appointmentId={appointment.id}
              status={appointment.status}
              seriesId={appointment.seriesId}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
