'use client';

import { CalendarClock, Check, Repeat, UserX, X } from 'lucide-react';
import Link from 'next/link';
import { useTransition } from 'react';

import type { AppointmentStatus } from '@haru/database';

import { Button } from '@/components/ui/button';

import {
  cancelAppointment,
  cancelAppointmentSeries,
  completeAppointment,
  confirmAppointment,
  markNoShow,
} from './actions';

interface AppointmentActionsProps {
  appointmentId: string;
  status: AppointmentStatus;
  /** Quando definido, o agendamento pertence a uma série recorrente. */
  seriesId?: string | null;
}

export function AppointmentActions({ appointmentId, status, seriesId }: AppointmentActionsProps) {
  const [pending, startTransition] = useTransition();

  // Estados terminais não têm ações
  if (status === 'COMPLETED' || status === 'CANCELED' || status === 'NO_SHOW') {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {status === 'PENDING' && (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => startTransition(() => confirmAppointment(appointmentId))}
        >
          <Check className="h-4 w-4" />
          Confirmar
        </Button>
      )}
      <Button size="sm" variant="outline" asChild>
        <Link href={`/appointments/${appointmentId}/reschedule`} title="Remarcar">
          <CalendarClock className="h-4 w-4" />
          Remarcar
        </Link>
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => startTransition(() => completeAppointment(appointmentId))}
        title="Marcar como atendido"
      >
        <Check className="h-4 w-4" />
        Atendido
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => startTransition(() => markNoShow(appointmentId))}
        title="Não compareceu"
      >
        <UserX className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => {
          if (!window.confirm('Cancelar este agendamento?')) return;
          startTransition(() => cancelAppointment(appointmentId));
        }}
        title="Cancelar"
      >
        <X className="h-4 w-4" />
      </Button>
      {seriesId && (
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => {
            if (!window.confirm('Cancelar TODA a série recorrente (ocorrências futuras)?')) return;
            startTransition(() => cancelAppointmentSeries(seriesId));
          }}
          title="Cancelar toda a série recorrente"
        >
          <Repeat className="h-4 w-4" />
          Cancelar série
        </Button>
      )}
    </div>
  );
}
