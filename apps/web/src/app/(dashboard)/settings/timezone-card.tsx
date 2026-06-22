'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

import { type TimezoneActionResult, updateTimezone } from './actions';

interface TimezoneCardProps {
  timezone: string;
}

// Subset comum de timezones brasileiros. Usuário pode digitar qualquer IANA
// válido — o servidor valida via Intl.DateTimeFormat.
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
    <Button type="submit" disabled={pending}>
      {pending ? 'Salvando…' : 'Salvar'}
    </Button>
  );
}

export function TimezoneCard({ timezone }: TimezoneCardProps) {
  const [state, formAction] = useActionState<TimezoneActionResult | undefined, FormData>(
    updateTimezone,
    undefined,
  );

  // Garante que o timezone atual aparece como opção mesmo se não estiver na lista
  const tzOptions = TIMEZONE_OPTIONS.includes(timezone)
    ? TIMEZONE_OPTIONS
    : [timezone, ...TIMEZONE_OPTIONS];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fuso horário</CardTitle>
        <CardDescription>
          Usado pra formatar datas e horários pro cliente e pros lembretes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="timezone">Fuso horário</Label>
            <select
              id="timezone"
              name="timezone"
              defaultValue={timezone}
              required
              className="border-input focus-visible:ring-ring flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1"
            >
              {tzOptions.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>

          {state && 'error' in state && <p className="text-destructive text-sm">{state.error}</p>}
          {state && 'ok' in state && <p className="text-sm text-emerald-600">Salvo.</p>}

          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}
