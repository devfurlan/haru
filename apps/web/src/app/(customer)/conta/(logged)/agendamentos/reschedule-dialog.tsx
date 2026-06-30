'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';

import {
  customerLoadSlots,
  customerRescheduleAppointment,
  type CustomerActionResult,
} from '@/app/(customer)/actions';
import { SlotPicker } from '@/components/slot-picker';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { BOOKING_HORIZON_DAYS } from '@/lib/booking-days';
import type { CustomerAppointmentItem } from '@/lib/customer';

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled}>
      {pending ? 'Remarcando…' : 'Confirmar nova data'}
    </Button>
  );
}

export function RescheduleDialog({ item }: { item: CustomerAppointmentItem }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [slotIso, setSlotIso] = useState('');
  const action = customerRescheduleAppointment.bind(null, item.id);
  const [state, formAction] = useActionState<CustomerActionResult, FormData>(action, undefined);

  // Fecha e atualiza a lista quando a remarcação dá certo.
  useEffect(() => {
    if (state && 'ok' in state) {
      setOpen(false);
      setSlotIso('');
      router.refresh();
    }
  }, [state, router]);

  const loadSlots = (svcId: string, dateStr: string) => customerLoadSlots(item.id, svcId, dateStr);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Remarcar
        </Button>
      </DialogTrigger>
      <DialogContent dismissable={false} className="max-w-md">
        <DialogHeader>
          <DialogTitle>Remarcar</DialogTitle>
          <DialogDescription>
            {item.serviceName} · {item.tenant.name}
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <SlotPicker
            serviceId={item.serviceId}
            timezone={item.tenant.timezone}
            openWeekdays={item.openWeekdays}
            horizonDays={BOOKING_HORIZON_DAYS}
            value={slotIso}
            onChange={setSlotIso}
            loadSlots={loadSlots}
            initialDate={item.currentDateStr}
          />
          <input type="hidden" name="newStartsAtIso" value={slotIso} />
          {state && 'error' in state && <p className="text-destructive text-sm">{state.error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Voltar
            </Button>
            <SubmitButton disabled={!slotIso} />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
