'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';

import { type TimezoneActionResult, updateTimezone } from './actions';

interface TimezoneCardProps {
  timezone: string;
}

// Subset comum de timezones brasileiros. Usuário pode digitar qualquer IANA
// válido - o servidor valida via Intl.DateTimeFormat.
const TIMEZONE_OPTIONS = [
  'America/Sao_Paulo',
  'America/Bahia',
  'America/Fortaleza',
  'America/Recife',
  'America/Belem',
  'America/Manaus',
  'America/Cuiaba',
  'America/Campo_Grande',
  'America/Porto_Velho',
  'America/Rio_Branco',
  'America/Noronha',
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? 'Salvando…' : 'Salvar'}
    </Button>
  );
}

export function TimezoneCard({ timezone }: TimezoneCardProps) {
  const [editing, setEditing] = useState(false);
  const [state, formAction] = useActionState<TimezoneActionResult | undefined, FormData>(
    updateTimezone,
    undefined,
  );

  // Fecha o editor ao salvar (mesmo padrão do card de pagamentos).
  if (state && 'ok' in state && editing) {
    setEditing(false);
  }

  // Garante que o timezone atual aparece como opção mesmo se não estiver na lista
  const tzOptions = TIMEZONE_OPTIONS.includes(timezone)
    ? TIMEZONE_OPTIONS
    : [timezone, ...TIMEZONE_OPTIONS];

  return (
    <div className="border-line bg-paper shadow-soft flex items-center gap-3 rounded-[18px] border p-[18px]">
      <div className="flex-1">
        <div className="text-ink font-serif text-[16px] font-semibold">Fuso horário</div>
        <div className="text-ink-50 mt-0.5 text-[12px] font-medium">
          {timezone} - usado nas datas pro cliente e nos lembretes.
        </div>

        {editing && (
          <form action={formAction} className="mt-3 flex flex-wrap items-center gap-2">
            <select
              name="timezone"
              defaultValue={timezone}
              required
              className="border-input focus-visible:ring-ring h-9 flex-1 rounded-md border bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1"
            >
              {tzOptions.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
            <SubmitButton />
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
            {state && 'error' in state && (
              <p className="text-destructive w-full text-sm">{state.error}</p>
            )}
          </form>
        )}
      </div>

      {!editing && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="border-edge text-ink-70 hover:bg-cream-2 flex-none rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition"
        >
          Alterar
        </button>
      )}
    </div>
  );
}
