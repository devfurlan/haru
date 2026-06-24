'use client';

import { CalendarClock, Check, Repeat, UserX, X } from 'lucide-react';
import Link from 'next/link';
import { useState, useTransition } from 'react';

import type { AppointmentStatus } from '@haru/database';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
  // Qual cancelamento está sendo confirmado (null = dialog fechado).
  const [cancelTarget, setCancelTarget] = useState<null | 'single' | 'series'>(null);
  // Se o cliente deve ser avisado pelo WhatsApp. Default: sim (cancelamento "puro").
  const [notifyClient, setNotifyClient] = useState(true);

  // Estados terminais não têm ações
  if (status === 'COMPLETED' || status === 'CANCELED' || status === 'NO_SHOW') {
    return null;
  }

  const openCancel = (target: 'single' | 'series') => {
    setNotifyClient(true);
    setCancelTarget(target);
  };

  const confirmCancel = () => {
    const target = cancelTarget;
    setCancelTarget(null);
    startTransition(() => {
      if (target === 'series' && seriesId) {
        cancelAppointmentSeries(seriesId, { notifyClient });
      } else {
        cancelAppointment(appointmentId, { notifyClient });
      }
    });
  };

  const isSeries = cancelTarget === 'series';

  return (
    <>
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
          onClick={() => openCancel('single')}
          title="Cancelar"
        >
          <X className="h-4 w-4" />
        </Button>
        {seriesId && (
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => openCancel('series')}
            title="Cancelar toda a série recorrente"
          >
            <Repeat className="h-4 w-4" />
            Cancelar série
          </Button>
        )}
      </div>

      <Dialog
        open={cancelTarget !== null}
        onOpenChange={(o) => {
          if (!o) setCancelTarget(null);
        }}
      >
        <DialogContent dismissable={false}>
          <DialogHeader>
            <DialogTitle className="text-xl">
              {isSeries ? 'Cancelar série recorrente' : 'Cancelar agendamento'}
            </DialogTitle>
            <p className="text-muted-foreground text-sm">
              {isSeries
                ? 'Cancela todas as ocorrências futuras dessa série. Os horários ficam livres na agenda.'
                : 'O horário fica livre na sua agenda.'}
            </p>
          </DialogHeader>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={notifyClient}
              onChange={(e) => setNotifyClient(e.target.checked)}
              className="mt-0.5 size-4"
            />
            <span>
              Avisar o cliente pelo WhatsApp
              <span className="text-muted-foreground mt-0.5 block text-xs">
                Desmarque se isso faz parte de uma remarcação - o cliente já foi movido pra outro
                horário e não precisa receber um aviso de cancelamento.
              </span>
            </span>
          </label>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setCancelTarget(null)}>
              Voltar
            </Button>
            <Button type="button" variant="destructive" onClick={confirmCancel}>
              {isSeries ? 'Cancelar série' : 'Cancelar agendamento'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
