'use client';

import { useActionState, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import {
  connectWhatsapp,
  disconnectWhatsapp,
  type WhatsappActionResult,
} from './actions';

interface WhatsappCardProps {
  phoneNumberId: string | null;
  businessAccountId: string | null;
  displayPhone: string | null;
  hasAccessToken: boolean;
}

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Salvando…' : editing ? 'Salvar conexão' : 'Conectar'}
    </Button>
  );
}

export function WhatsappCard({
  phoneNumberId,
  businessAccountId,
  displayPhone,
  hasAccessToken,
}: WhatsappCardProps) {
  const connected = Boolean(phoneNumberId && hasAccessToken);
  const [showForm, setShowForm] = useState(!connected);
  const [state, formAction] = useActionState<WhatsappActionResult | undefined, FormData>(
    connectWhatsapp,
    undefined,
  );
  const [disconnectPending, startDisconnect] = useTransition();

  // Quando salva com sucesso, recolhe pra view conectada
  if (state && 'ok' in state && showForm && connected) {
    setShowForm(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>WhatsApp Business</CardTitle>
        <CardDescription>
          Conecte o número que você configurou no Meta for Developers. O bot vai responder pelo
          phone_number_id informado.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {connected && !showForm && (
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">phone_number_id: </span>
              <span className="font-mono">{phoneNumberId}</span>
            </div>
            {businessAccountId && (
              <div>
                <span className="text-muted-foreground">business_account_id: </span>
                <span className="font-mono">{businessAccountId}</span>
              </div>
            )}
            <div className="text-muted-foreground">access_token: ••••••••</div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
                Editar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={disconnectPending}
                onClick={() => {
                  if (!window.confirm('Desconectar o WhatsApp deste estabelecimento?')) return;
                  startDisconnect(() => disconnectWhatsapp().then(() => setShowForm(true)));
                }}
              >
                {disconnectPending ? 'Desconectando…' : 'Desconectar'}
              </Button>
            </div>
          </div>
        )}

        {showForm && (
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phoneNumberId">phone_number_id</Label>
              <Input
                id="phoneNumberId"
                name="phoneNumberId"
                defaultValue={phoneNumberId ?? ''}
                placeholder="123456789012345"
                required
              />
              <p className="text-xs text-muted-foreground">
                Em Meta for Developers → WhatsApp → API Setup, debaixo do número.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessAccountId">business_account_id (opcional)</Label>
              <Input
                id="businessAccountId"
                name="businessAccountId"
                defaultValue={businessAccountId ?? ''}
                placeholder="123456789012345"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayPhone">Telefone público (E.164, opcional)</Label>
              <Input
                id="displayPhone"
                name="displayPhone"
                defaultValue={displayPhone ?? ''}
                placeholder="5511987654321"
              />
              <p className="text-xs text-muted-foreground">
                Usado no link <code>wa.me/...</code> da página pública. Só dígitos, sem +,
                espaços ou parênteses.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accessToken">access_token</Label>
              <Input
                id="accessToken"
                name="accessToken"
                type="password"
                placeholder="EAAB…"
                required
              />
              <p className="text-xs text-muted-foreground">
                Token de System User com permissão whatsapp_business_messaging. Em dev você pode
                usar o token temporário de 24h do API Setup.
              </p>
            </div>

            {state && 'error' in state && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}

            <div className="flex gap-2">
              <SubmitButton editing={connected} />
              {connected && (
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
