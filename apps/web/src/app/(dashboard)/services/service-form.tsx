'use client';

import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { createService, updateService, type ServiceActionResult } from './actions';

export interface ServiceFormDefaults {
  id?: string;
  name?: string;
  description?: string | null;
  durationMinutes?: number;
  priceCents?: number;
}

interface ServiceFormProps {
  defaults?: ServiceFormDefaults;
  onSuccess?: () => void;
  onCancel?: () => void;
}

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Salvando…' : editing ? 'Salvar alterações' : 'Adicionar serviço'}
    </Button>
  );
}

export function ServiceForm({ defaults, onSuccess, onCancel }: ServiceFormProps) {
  const editing = Boolean(defaults?.id);
  const action = editing
    ? updateService.bind(null, defaults!.id!)
    : (createService as (
        prev: ServiceActionResult | undefined,
        formData: FormData,
      ) => Promise<ServiceActionResult>);

  const [state, formAction] = useActionState<ServiceActionResult | undefined, FormData>(
    action,
    undefined,
  );

  useEffect(() => {
    if (state && 'ok' in state) {
      onSuccess?.();
    }
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            name="name"
            defaultValue={defaults?.name}
            placeholder="Corte de cabelo"
            required
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">Descrição (opcional)</Label>
          <Input
            id="description"
            name="description"
            defaultValue={defaults?.description ?? ''}
            placeholder="Inclui lavagem"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="durationMinutes">Duração (minutos)</Label>
          <Input
            id="durationMinutes"
            name="durationMinutes"
            type="number"
            min={1}
            max={480}
            step={5}
            defaultValue={defaults?.durationMinutes ?? 30}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="priceReais">Preço (R$)</Label>
          <Input
            id="priceReais"
            name="priceReais"
            type="text"
            inputMode="decimal"
            defaultValue={
              defaults?.priceCents !== undefined ? (defaults.priceCents / 100).toFixed(2) : ''
            }
            placeholder="50,00"
            required
          />
        </div>
      </div>

      {state && 'error' in state && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <div className="flex gap-2">
        <SubmitButton editing={editing} />
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
