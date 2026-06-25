'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { maskBRLInput } from '@/lib/format';

import { createService, updateService, type ServiceActionResult } from './actions';

export interface ServiceFormDefaults {
  id?: string;
  name?: string;
  description?: string | null;
  durationMinutes?: number;
  priceCents?: number;
}

export interface ProfessionalOption {
  id: string;
  name: string | null;
}

interface ServiceFormProps {
  defaults?: ServiceFormDefaults;
  /** Profissionais do tenant - o seletor só aparece quando há mais de um. */
  professionals?: ProfessionalOption[];
  /** Ids dos profissionais já vinculados (edição). Vazio = todos (default). */
  selectedProfessionalIds?: string[];
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

export function ServiceForm({
  defaults,
  professionals = [],
  selectedProfessionalIds,
  onSuccess,
  onCancel,
}: ServiceFormProps) {
  const editing = Boolean(defaults?.id);
  const multiProf = professionals.length > 1;
  // Sem seleção definida (serviço novo) = todos marcados por default.
  const selectedSet = new Set(selectedProfessionalIds ?? professionals.map((p) => p.id));
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

  const [price, setPrice] = useState(() =>
    defaults?.priceCents !== undefined ? maskBRLInput(String(defaults.priceCents)) : '',
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
            step={1}
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
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(maskBRLInput(e.target.value))}
            placeholder="50,00"
            required
          />
        </div>
      </div>

      {multiProf && (
        <div className="space-y-2">
          <Label>Quem atende este serviço</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {professionals.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="professionalIds"
                  value={p.id}
                  defaultChecked={selectedSet.has(p.id)}
                  className="size-4"
                />
                {p.name ?? 'Sem nome'}
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Só os marcados aparecem no agendamento deste serviço. Nenhum marcado = todos.
          </p>
        </div>
      )}

      {state && 'error' in state && <p className="text-sm text-destructive">{state.error}</p>}

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
