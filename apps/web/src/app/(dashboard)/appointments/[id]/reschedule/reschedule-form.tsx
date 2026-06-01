'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { rescheduleAppointment, type RescheduleResult } from '../../actions';

interface RescheduleFormProps {
  appointmentId: string;
  currentStartsAtIso: string;
}

/**
 * Converte ISO UTC pro formato `YYYY-MM-DDTHH:mm` usado pelo input
 * datetime-local — preserva o relógio do navegador.
 */
function isoToDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Remarcando…' : 'Confirmar nova data'}
    </Button>
  );
}

export function RescheduleForm({ appointmentId, currentStartsAtIso }: RescheduleFormProps) {
  const router = useRouter();
  const actionWithId = rescheduleAppointment.bind(null, appointmentId);
  const [state, formAction] = useActionState<RescheduleResult, FormData>(
    actionWithId,
    undefined,
  );

  // Inicializa com o ISO atual pra que enviar sem trocar nada não vire erro.
  const [newIso, setNewIso] = useState(currentStartsAtIso);

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    if (!value) {
      setNewIso('');
      return;
    }
    const d = new Date(value);
    setNewIso(Number.isNaN(d.getTime()) ? '' : d.toISOString());
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="newStartsAt">Novo horário</Label>
        <Input
          id="newStartsAt"
          type="datetime-local"
          step={300}
          defaultValue={isoToDatetimeLocal(currentStartsAtIso)}
          onChange={handleDateChange}
          required
        />
        <input type="hidden" name="newStartsAtIso" value={newIso} />
      </div>

      {state && 'error' in state && state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <div className="flex gap-2">
        <SubmitButton />
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
