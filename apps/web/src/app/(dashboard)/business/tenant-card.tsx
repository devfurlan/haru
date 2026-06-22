'use client';

import { Check, Copy, Share2 } from 'lucide-react';
import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { updateTenant, type TenantActionResult } from '../settings/actions';
import { LogoUploader } from './logo-uploader';

interface TenantCardProps {
  name: string;
  slug: string;
  address: string | null;
  description: string | null;
  whatsappAbout: string | null;
  email: string | null;
  logoUrl: string | null;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Salvando…' : 'Salvar'}
    </Button>
  );
}

export function TenantCard({
  name,
  slug,
  address,
  description,
  whatsappAbout,
  email,
  logoUrl,
}: TenantCardProps) {
  const [state, formAction] = useActionState<TenantActionResult | undefined, FormData>(
    updateTenant,
    undefined,
  );

  // Reflete o slug em edição na URL pública exibida, mas só aponta pro slug já salvo.
  const [slugValue, setSlugValue] = useState(slug);
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.demandae.com').replace(
    /\/$/,
    '',
  );
  const publicUrl = `${baseUrl}/${slugValue}`;
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard pode falhar fora de https/localhost - ignora silenciosamente.
    }
  }

  async function share() {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title: name, url: publicUrl });
        return;
      } catch {
        // usuário cancelou ou share falhou - cai pro copiar.
      }
    }
    void copy();
  }

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
        <div className="space-y-2">
          <Label>Sua página pública</Label>
          <div className="flex items-center gap-2">
            <code className="bg-muted flex-1 truncate rounded-md border px-3 py-2 text-sm">
              {publicUrl}
            </code>
            <Button type="button" variant="outline" size="icon" onClick={copy} title="Copiar link">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={share}
              title="Compartilhar link"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <LogoUploader logoUrl={logoUrl} />

        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" name="name" defaultValue={name} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              name="slug"
              value={slugValue}
              onChange={(e) => setSlugValue(e.target.value)}
              pattern="[a-z0-9-]+"
              required
            />
            <p className="text-muted-foreground text-xs">
              Aceita minúsculas, dígitos e hífen. Não pode coincidir com rotas do sistema (login,
              dashboard, services etc.).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Endereço - opcional</Label>
            <Input
              id="address"
              name="address"
              defaultValue={address ?? ''}
              placeholder="Rua Exemplo, 123 - Centro, Cidade/UF"
            />
            <p className="text-muted-foreground text-xs">
              Aparece pro cliente na sua página pública.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição - opcional</Label>
            <Input
              id="description"
              name="description"
              defaultValue={description ?? ''}
              maxLength={256}
              placeholder="Ex.: Barbearia especializada em cortes e barba."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail de contato - opcional</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={email ?? ''}
              placeholder="contato@seunegocio.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsappAbout">Status do WhatsApp - opcional</Label>
            <Input
              id="whatsappAbout"
              name="whatsappAbout"
              defaultValue={whatsappAbout ?? ''}
              maxLength={139}
              placeholder="Ex.: Atendimento de seg a sáb, 9h às 19h"
            />
          </div>

          <p className="text-muted-foreground text-xs">
            Endereço, descrição, e-mail, status e a logo também atualizam automaticamente o seu
            perfil no WhatsApp (quando conectado).
          </p>

          {state && 'error' in state && <p className="text-destructive text-sm">{state.error}</p>}
          {state && 'ok' in state && <p className="text-sm text-emerald-600">Salvo.</p>}

          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}
