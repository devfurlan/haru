'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { SlotPicker } from '@/components/slot-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import {
  createManualAppointment,
  getTenantAvailableSlots,
  type CreateAppointmentResult,
} from '../actions';

interface ServiceOption {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
}

interface NewAppointmentFormProps {
  services: ServiceOption[];
  timezone: string;
  openWeekdays: number[];
  horizonDays: number;
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

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled}>
      {pending ? 'Criando…' : 'Criar agendamento'}
    </Button>
  );
}

export function NewAppointmentForm({
  services,
  timezone,
  openWeekdays,
  horizonDays,
}: NewAppointmentFormProps) {
  const [state, formAction] = useActionState<CreateAppointmentResult, FormData>(
    createManualAppointment,
    undefined,
  );

  const [serviceId, setServiceId] = useState('');
  // Slot escolhido na grade (ISO UTC) — o servidor revalida que é um horário livre.
  const [startsAtIso, setStartsAtIso] = useState('');

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
          <p className="text-muted-foreground text-xs">Só dígitos, com DDI (55) e DDD.</p>
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
          className="border-input focus-visible:ring-ring flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1"
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
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
        <Label>Data e hora</Label>
        {serviceId ? (
          <SlotPicker
            serviceId={serviceId}
            timezone={timezone}
            openWeekdays={openWeekdays}
            horizonDays={horizonDays}
            value={startsAtIso}
            onChange={setStartsAtIso}
            loadSlots={getTenantAvailableSlots}
          />
        ) : (
          <p className="bg-muted text-muted-foreground rounded-lg border p-4 text-sm">
            Selecione um serviço para ver os horários disponíveis.
          </p>
        )}
        <input type="hidden" name="startsAtIso" value={startsAtIso} />
      </div>

      {state && 'error' in state && state.error && (
        <p className="text-destructive text-sm">{state.error}</p>
      )}

      <div className="flex gap-2">
        <SubmitButton disabled={!serviceId || !startsAtIso} />
      </div>
    </form>
  );
}
