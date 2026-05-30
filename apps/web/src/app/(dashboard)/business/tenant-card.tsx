'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { updateTenant, type TenantActionResult } from '../settings/actions';
import { LogoUploader } from './logo-uploader';

interface TenantCardProps {
  tenantId: string;
  name: string;
  slug: string;
  timezone: string;
  address: string | null;
  logoUrl: string | null;
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

export function TenantCard({ tenantId, name, slug, timezone, address, logoUrl }: TenantCardProps) {
  const [state, formAction] = useActionState<TenantActionResult | undefined, FormData>(
    updateTenant,
    undefined,
  );

  // Garante que o timezone atual aparece como opção mesmo se não estiver na lista
  const tzOptions = TIMEZONE_OPTIONS.includes(timezone)
    ? TIMEZONE_OPTIONS
    : [timezone, ...TIMEZONE_OPTIONS];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Estabelecimento</CardTitle>
        <CardDescription>
          Nome aparece pra cliente. Slug é a URL pública: <code>/{slug}</code>. Mudar o slug quebra
          links antigos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <LogoUploader tenantId={tenantId} logoUrl={logoUrl} />

        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" name="name" defaultValue={name} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" name="slug" defaultValue={slug} pattern="[a-z0-9-]+" required />
            <p className="text-muted-foreground text-xs">
              Aceita minúsculas, dígitos e hífen. Não pode coincidir com rotas do sistema (login,
              dashboard, services etc.).
            </p>
          </div>

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
            <p className="text-muted-foreground text-xs">
              Usado pra formatar datas pro cliente e pro lembrete.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Endereço — opcional</Label>
            <Input
              id="address"
              name="address"
              defaultValue={address ?? ''}
              placeholder="Rua Exemplo, 123 — Centro, Cidade/UF"
            />
            <p className="text-muted-foreground text-xs">
              Aparece pro cliente na sua página pública.
            </p>
          </div>

          {state && 'error' in state && <p className="text-destructive text-sm">{state.error}</p>}
          {state && 'ok' in state && <p className="text-sm text-emerald-600">Salvo.</p>}

          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}
