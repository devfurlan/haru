'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

import {
  customerRebook,
  customerRebookSlots,
  type CustomerRebookResult,
} from '@/app/(customer)/actions';
import { SlotPicker } from '@/components/slot-picker';
import { Button } from '@/components/ui/button';
import { BOOKING_HORIZON_DAYS } from '@haru/shared';

interface RebookFormProps {
  sourceAppointmentId: string;
  serviceId: string;
  timezone: string;
  openWeekdays: number[];
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled}>
      {pending ? 'Agendando…' : 'Confirmar agendamento'}
    </Button>
  );
}

export function RebookForm({
  sourceAppointmentId,
  serviceId,
  timezone,
  openWeekdays,
}: RebookFormProps) {
  const [slotIso, setSlotIso] = useState('');
  const [state, formAction] = useActionState<CustomerRebookResult, FormData>(
    customerRebook,
    undefined,
  );

  const loadSlots = (svcId: string, dateStr: string) =>
    customerRebookSlots(sourceAppointmentId, svcId, dateStr);

  if (state && 'ok' in state) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-lg font-medium">
          {state.status === 'CONFIRMED' ? 'Agendamento confirmado!' : 'Agendamento solicitado!'}
        </p>
        <p className="text-muted-foreground text-sm">
          {state.status === 'CONFIRMED'
            ? 'Seu horário já está reservado.'
            : 'O estabelecimento vai confirmar em breve.'}
        </p>
        <Button asChild>
          <Link href="/conta/agendamentos">Ver meus agendamentos</Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <SlotPicker
        serviceId={serviceId}
        timezone={timezone}
        openWeekdays={openWeekdays}
        horizonDays={BOOKING_HORIZON_DAYS}
        value={slotIso}
        onChange={setSlotIso}
        loadSlots={loadSlots}
      />
      <input type="hidden" name="sourceAppointmentId" value={sourceAppointmentId} />
      <input type="hidden" name="slotIso" value={slotIso} />
      {state && 'error' in state && <p className="text-destructive text-sm">{state.error}</p>}
      <SubmitButton disabled={!slotIso} />
    </form>
  );
}
