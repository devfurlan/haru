'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { SlotPicker } from '@/components/slot-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RECURRENCE_OCCURRENCE_OPTIONS, type RecurrenceFrequency } from '@/lib/recurrence';

import {
  createManualAppointment,
  getTenantAvailableSlots,
  type CreateAppointmentResult,
} from '../actions';

type FrequencyChoice = 'NONE' | RecurrenceFrequency;

const FREQUENCY_LABELS: Record<FrequencyChoice, string> = {
  NONE: 'Não repetir',
  WEEKLY: 'Semanal',
  BIWEEKLY: 'Quinzenal',
  MONTHLY: 'Mensal',
};

const FREQUENCY_ORDER: FrequencyChoice[] = ['NONE', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'];

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
  isAdmin: boolean;
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
  isAdmin,
}: NewAppointmentFormProps) {
  const [state, formAction] = useActionState<CreateAppointmentResult, FormData>(
    createManualAppointment,
    undefined,
  );

  const [serviceId, setServiceId] = useState('');
  // Slot escolhido na grade (ISO UTC) — o servidor revalida que é um horário livre.
  const [startsAtIso, setStartsAtIso] = useState('');
  const [frequency, setFrequency] = useState<FrequencyChoice>('NONE');
  const [occurrences, setOccurrences] = useState(4);

  // Encaixe (só admin): libera as 24h e a sobreposição. Troca a grade de slots por
  // data+hora livres e força agendamento avulso (sem recorrência).
  const [encaixe, setEncaixe] = useState(false);
  const [encaixeDate, setEncaixeDate] = useState('');
  const [encaixeTime, setEncaixeTime] = useState('');

  // Sucesso de uma série criada: mostra resumo em vez de redirecionar.
  if (state && 'ok' in state) {
    const skippedFmt = state.skipped.map((iso) =>
      new Intl.DateTimeFormat('pt-BR', {
        timeZone: timezone,
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(iso)),
    );
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm dark:border-green-900 dark:bg-green-950">
          <p className="font-medium text-green-800 dark:text-green-300">
            Série criada: {state.createdCount}{' '}
            {state.createdCount === 1 ? 'agendamento' : 'agendamentos'}.
          </p>
          {skippedFmt.length > 0 && (
            <div className="mt-2 text-green-800/80 dark:text-green-300/80">
              <p>Pulamos {skippedFmt.length} por horário ocupado ou fora do expediente:</p>
              <ul className="mt-1 list-inside list-disc">
                {skippedFmt.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          )}
          {state.beyondHorizon > 0 && (
            <p className="mt-2 text-green-800/80 dark:text-green-300/80">
              {state.beyondHorizon}{' '}
              {state.beyondHorizon === 1 ? 'ocorrência ficou' : 'ocorrências ficaram'} além do
              limite de 90 dias e não {state.beyondHorizon === 1 ? 'foi' : 'foram'} criada
              {state.beyondHorizon === 1 ? '' : 's'}.
            </p>
          )}
        </div>
        <Button asChild>
          <Link href="/appointments">Ver agenda</Link>
        </Button>
      </div>
    );
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

      {isAdmin && (
        <label className="bg-muted/40 flex items-start gap-3 rounded-lg border p-3">
          <input
            type="checkbox"
            className="mt-0.5 size-4"
            checked={encaixe}
            onChange={(e) => setEncaixe(e.target.checked)}
          />
          <span className="space-y-0.5 text-sm">
            <span className="block font-medium">Encaixe (admin)</span>
            <span className="text-muted-foreground block text-xs">
              Libera qualquer horário das 24h e permite sobrepor outro agendamento. Ignora o
              expediente. Sempre avulso (sem repetição).
            </span>
          </span>
          <input type="hidden" name="encaixe" value={encaixe ? 'on' : ''} />
        </label>
      )}

      <div className="space-y-2">
        <Label>Data e hora</Label>
        {encaixe ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="encaixeDate">Data</Label>
              <Input
                id="encaixeDate"
                name="encaixeDate"
                type="date"
                value={encaixeDate}
                onChange={(e) => setEncaixeDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="encaixeTime">Hora</Label>
              <Input
                id="encaixeTime"
                name="encaixeTime"
                type="time"
                value={encaixeTime}
                onChange={(e) => setEncaixeTime(e.target.value)}
              />
            </div>
            <p className="text-muted-foreground col-span-full text-xs">
              Interpretado no seu fuso ({timezone}). Sem validação de disponibilidade.
            </p>
          </div>
        ) : serviceId ? (
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

      {!encaixe && (
        <div className="space-y-2">
          <Label>Repetição</Label>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Repetição">
            {FREQUENCY_ORDER.map((f) => (
              <Button
                key={f}
                type="button"
                variant={frequency === f ? 'default' : 'outline'}
                size="sm"
                aria-pressed={frequency === f}
                onClick={() => setFrequency(f)}
              >
                {FREQUENCY_LABELS[f]}
              </Button>
            ))}
          </div>
          <input type="hidden" name="frequency" value={frequency} />

          {frequency !== 'NONE' && (
            <div className="space-y-2 pt-2">
              <Label>Quantas vezes</Label>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Número de ocorrências">
                {RECURRENCE_OCCURRENCE_OPTIONS.map((n) => (
                  <Button
                    key={n}
                    type="button"
                    variant={occurrences === n ? 'default' : 'outline'}
                    size="sm"
                    aria-pressed={occurrences === n}
                    onClick={() => setOccurrences(n)}
                  >
                    {n}×
                  </Button>
                ))}
              </div>
              <input type="hidden" name="occurrences" value={occurrences} />
              <p className="text-muted-foreground text-xs">
                Repete {FREQUENCY_LABELS[frequency].toLowerCase()} a partir do horário escolhido.
                Pulamos automaticamente datas ocupadas ou fora do expediente (limite de 90 dias).
              </p>
            </div>
          )}
        </div>
      )}

      {state && 'error' in state && state.error && (
        <p className="text-destructive text-sm">{state.error}</p>
      )}

      <div className="flex gap-2">
        <SubmitButton
          disabled={!serviceId || (encaixe ? !encaixeDate || !encaixeTime : !startsAtIso)}
        />
      </div>
    </form>
  );
}
