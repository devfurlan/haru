'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { formatDuration, maskBRLInput } from '@haru/shared';

import { createService, updateService, type ServiceActionResult } from './actions';

export interface ServiceFormDefaults {
  id?: string;
  name?: string;
  description?: string | null;
  durationMinutes?: number;
  priceCents?: number;
  returnCycleDays?: number | null;
}

export interface ProfessionalOption {
  id: string;
  name: string | null;
}

interface ServiceFormProps {
  defaults?: ServiceFormDefaults;
  professionals?: ProfessionalOption[];
  selectedProfessionalIds?: string[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

const inputCls =
  'rounded-xl border border-edge bg-cream px-3.5 py-3 text-sm text-ink outline-none placeholder:text-ink-30 focus:border-green-deep';

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="coral" disabled={pending}>
      {pending ? 'Salvando…' : editing ? 'Salvar serviço' : 'Adicionar serviço'}
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
  const [duration, setDuration] = useState(defaults?.durationMinutes ?? 30);
  const [pros, setPros] = useState<Set<string>>(
    () => new Set(selectedProfessionalIds ?? professionals.map((p) => p.id)),
  );

  // Se a duração salva não é uma das opções, vira uma opção extra selecionável.
  const durationChips = DURATION_OPTIONS.includes(duration)
    ? DURATION_OPTIONS
    : [...DURATION_OPTIONS, duration].sort((a, b) => a - b);

  useEffect(() => {
    if (state && 'ok' in state) onSuccess?.();
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-xs font-semibold text-ink-70">
          Nome do serviço
        </label>
        <input id="name" name="name" defaultValue={defaults?.name} placeholder="Ex.: Corte degradê" required className={inputCls} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-xs font-semibold text-ink-70">
          Descrição <span className="font-medium text-ink-30">· opcional</span>
        </label>
        <input
          id="description"
          name="description"
          defaultValue={defaults?.description ?? ''}
          placeholder="Ex.: inclui lavagem"
          className={inputCls}
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-ink-70">Duração</span>
        <div className="flex flex-wrap gap-2">
          {durationChips.map((d) => (
            <Chip key={d} type="button" selected={duration === d} onClick={() => setDuration(d)}>
              {formatDuration(d)}
            </Chip>
          ))}
        </div>
        <input type="hidden" name="durationMinutes" value={duration} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="priceReais" className="text-xs font-semibold text-ink-70">
          Preço
        </label>
        <div className="flex items-center overflow-hidden rounded-xl border border-edge bg-cream focus-within:border-green-deep">
          <span className="pl-3.5 font-serif text-sm text-ink-50">R$</span>
          <input
            id="priceReais"
            name="priceReais"
            type="text"
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(maskBRLInput(e.target.value))}
            placeholder="0,00"
            required
            className="flex-1 bg-transparent px-2 py-3 text-sm text-ink outline-none placeholder:text-ink-30"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="returnCycleDays" className="text-xs font-semibold text-ink-70">
          Ritmo de retorno <span className="font-medium text-ink-30">· opcional</span>
        </label>
        <div className="flex items-center overflow-hidden rounded-xl border border-edge bg-cream focus-within:border-green-deep">
          <span className="pl-3.5 font-serif text-sm text-ink-50">a cada</span>
          <input
            id="returnCycleDays"
            name="returnCycleDays"
            type="number"
            min={1}
            max={365}
            defaultValue={defaults?.returnCycleDays ?? ''}
            placeholder="30"
            className="flex-1 bg-transparent px-2 py-3 text-sm text-ink outline-none placeholder:text-ink-30"
          />
          <span className="pr-3.5 font-serif text-sm text-ink-50">dias</span>
        </div>
        <p className="text-[11px] text-ink-50">
          Serve pro lembrete de retorno quando o cliente ainda não tem histórico. Vazio = a
          gente aprende do ritmo real de cada um.
        </p>
      </div>

      {multiProf && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-ink-70">Quem faz</span>
          {[...pros].map((id) => (
            <input key={id} type="hidden" name="professionalIds" value={id} />
          ))}
          <div className="flex flex-wrap gap-2">
            {professionals.map((p) => (
              <Chip
                key={p.id}
                type="button"
                selected={pros.has(p.id)}
                onClick={() =>
                  setPros((prev) => {
                    const next = new Set(prev);
                    if (next.has(p.id)) next.delete(p.id);
                    else next.add(p.id);
                    return next;
                  })
                }
              >
                {p.name ?? 'Sem nome'}
              </Chip>
            ))}
          </div>
          <p className="text-[11px] text-ink-50">
            Só os marcados aparecem no agendamento deste serviço. Nenhum marcado = todos.
          </p>
        </div>
      )}

      {state && 'error' in state && <p className="text-sm text-coral-deep">{state.error}</p>}

      <div className="flex items-center justify-end gap-2 pt-1">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <SubmitButton editing={editing} />
      </div>
    </form>
  );
}
