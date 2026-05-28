'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { createManualAppointment, type CreateAppointmentResult } from '../actions';

interface ServiceOption {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
}

interface NewAppointmentFormProps {
  services: ServiceOption[];
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

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Criando…' : 'Criar agendamento'}
    </Button>
  );
}

export function NewAppointmentForm({ services }: NewAppointmentFormProps) {
  const [state, formAction] = useActionState<CreateAppointmentResult, FormData>(
    createManualAppointment,
    undefined,
  );

  // Converte o valor do <input type="datetime-local"> (local browser) pra ISO
  // antes de enviar — assim o servidor recebe UTC inequívoco, sem depender do
  // TZ do processo Node.
  const [startsAtIso, setStartsAtIso] = useState('');

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value; // ex: "2026-05-28T14:00"
    if (!value) {
      setStartsAtIso('');
      return;
    }
    const date = new Date(value);
    setStartsAtIso(Number.isNaN(date.getTime()) ? '' : date.toISOString());
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="contactPhone">Telefone do cliente</Label>
          <Input
            id="contactPhone"
            name="contactPhone"
            type="tel"
            inputMode="numeric"
            placeholder="5511987654321"
            required
          />
          <p className="text-xs text-muted-foreground">Só dígitos, com DDI (55) e DDD.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="contactName">Nome (opcional)</Label>
          <Input id="contactName" name="contactName" placeholder="Maria Silva" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="serviceId">Serviço</Label>
        <select
          id="serviceId"
          name="serviceId"
          required
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          defaultValue=""
        >
          <option value="" disabled>
            Selecione um serviço
          </option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {formatDuration(s.durationMinutes)} · {formatBRL(s.priceCents)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="startsAt">Data e hora</Label>
        <Input
          id="startsAt"
          type="datetime-local"
          required
          step={300}
          onChange={handleDateChange}
        />
        <input type="hidden" name="startsAtIso" value={startsAtIso} />
      </div>

      {state && 'error' in state && state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <div className="flex gap-2">
        <SubmitButton />
      </div>
    </form>
  );
}
