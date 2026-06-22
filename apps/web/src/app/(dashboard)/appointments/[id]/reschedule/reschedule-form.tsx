'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { SlotPicker } from '@/components/slot-picker';
import { Button } from '@/components/ui/button';

import {
  getTenantAvailableSlots,
  rescheduleAppointment,
  type RescheduleResult,
} from '../../actions';

interface RescheduleFormProps {
  appointmentId: string;
  serviceId: string;
  /** Dia atual do agendamento (YYYY-MM-DD no fuso do tenant) - pré-seleciona. */
  currentDateStr: string;
  timezone: string;
  openWeekdays: number[];
  horizonDays: number;
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled}>
      {pending ? 'Remarcando…' : 'Confirmar nova data'}
    </Button>
  );
}

export function RescheduleForm({
  appointmentId,
  serviceId,
  currentDateStr,
  timezone,
  openWeekdays,
  horizonDays,
}: RescheduleFormProps) {
  const router = useRouter();
  const actionWithId = rescheduleAppointment.bind(null, appointmentId);
  const [state, formAction] = useActionState<RescheduleResult, FormData>(actionWithId, undefined);

  const [slotIso, setSlotIso] = useState('');

  // O próprio agendamento não conta como ocupado - senão o horário atual sumiria
  // das opções. Por isso o reschedule passa `appointmentId` como exclusão.
  const loadSlots = (svcId: string, dateStr: string) =>
    getTenantAvailableSlots(svcId, dateStr, appointmentId);

  return (
    <form action={formAction} className="space-y-4">
      <SlotPicker
        serviceId={serviceId}
        timezone={timezone}
        openWeekdays={openWeekdays}
        horizonDays={horizonDays}
        value={slotIso}
        onChange={setSlotIso}
        loadSlots={loadSlots}
        initialDate={currentDateStr}
      />

      <input type="hidden" name="newStartsAtIso" value={slotIso} />

      {state && 'error' in state && state.error && (
        <p className="text-destructive text-sm">{state.error}</p>
      )}

      <div className="flex gap-2">
        <SubmitButton disabled={!slotIso} />
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
