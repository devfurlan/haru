'use client';

import { CalendarClock, Check, UserX, X } from 'lucide-react';
import Link from 'next/link';
import { useTransition } from 'react';

import type { AppointmentStatus } from '@haru/database';

import { Button } from '@/components/ui/button';

import {
  cancelAppointment,
  completeAppointment,
  confirmAppointment,
  markNoShow,
} from './actions';

interface AppointmentActionsProps {
  appointmentId: string;
  status: AppointmentStatus;
}

export function AppointmentActions({ appointmentId, status }: AppointmentActionsProps) {
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
    </div>
  );
}
