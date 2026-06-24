'use client';

import { CheckCircle2, ChevronDown, Copy, XCircle } from 'lucide-react';
import { useActionState, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BOT_WEBHOOK_URL } from '@/lib/whatsapp-status';

import { connectWhatsapp, disconnectWhatsapp, type WhatsappActionResult } from './actions';
import { EmbeddedSignup } from './embedded-signup';

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

function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <code className="bg-muted flex-1 break-all rounded px-2 py-1 text-xs">{value}</code>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0"
        onClick={() => {
          navigator.clipboard.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
      >
        <Copy className="mr-1 h-3 w-3" />
        {copied ? 'Copiado' : 'Copiar'}
      </Button>
    </div>
  );
}

function MetaGuide() {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-muted/30 rounded-lg border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between p-3 text-left text-sm font-medium"
      >
        Como obter esses dados na Meta (passo a passo)
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="space-y-4 border-t p-4 text-sm">
          <p className="text-muted-foreground">
            Você precisa de um app no{' '}
            <a
              href="https://developers.facebook.com/apps"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              Meta for Developers
            </a>{' '}
            com o produto <strong>WhatsApp</strong> adicionado. Depois siga os passos:
          </p>

          <ol className="space-y-3">
            <li>
              <p className="font-medium">1. Configure o webhook</p>
              <p className="text-muted-foreground">
                No app: <strong>WhatsApp → Configuração (Configuration)</strong>. No campo{' '}
                <strong>Callback URL</strong>, cole exatamente:
              </p>
              <div className="mt-1.5">
                <CopyField value={BOT_WEBHOOK_URL} />
              </div>
              <p className="text-muted-foreground mt-1.5">
                No campo <strong>Verify token</strong>, use o token que você definiu (ou peça ao
                suporte do Demandaê). Clique em <strong>Verificar e salvar</strong>.
              </p>
            </li>
            <li>
              <p className="font-medium">2. Assine o evento de mensagens</p>
              <p className="text-muted-foreground">
                Ainda em Configuração, em <strong>Webhook fields</strong>, marque{' '}
                <strong>messages</strong> como inscrito (Subscribe). Sem isso a Meta nunca envia as
                mensagens dos clientes.
              </p>
            </li>
            <li>
              <p className="font-medium">3. Pegue os IDs e o token</p>
              <p className="text-muted-foreground">
                Em <strong>WhatsApp → Configuração da API (API Setup)</strong> você encontra o{' '}
                <strong>phone_number_id</strong> (debaixo do número) e o{' '}
                <strong>access token</strong> temporário (24h, bom para teste). Copie e cole nos
                campos abaixo.
              </p>
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}

/**
 * Embrulha o formulário manual de credenciais. Quando ainda não está conectado, fica
 * recolhido atrás de "Conexão manual (avançado)" - o caminho principal é o Embedded
 * Signup. Em edição (já conectado) abre direto, já que é o único caminho de edição.
 */
function ManualConnect({
  defaultOpen,
  children,
}: {
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (defaultOpen) {
    return <div className="space-y-4">{children}</div>;
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-muted-foreground flex w-full items-center justify-between text-sm font-medium"
      >
        Conexão manual (avançado)
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="mt-4 space-y-4">{children}</div>}
    </div>
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
        <div className="flex items-center justify-between gap-2">
          <CardTitle>WhatsApp Business</CardTitle>
          {connected ? (
            <Badge variant="success" className="px-2.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Conectado
            </Badge>
          ) : (
            <Badge variant="pending" className="px-2.5">
              <XCircle className="h-3.5 w-3.5" />
              Não conectado
            </Badge>
          )}
        </div>
        <CardDescription>
          Conecte o número de WhatsApp do seu estabelecimento para o bot atender seus clientes.
          {!connected && ' Enquanto não conectar, nenhuma mensagem é recebida ou respondida.'}
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
          <>
            {/* Onboarding automático (Embedded Signup) - caminho principal quando
                ainda não está conectado. Em edição, vai direto pro form manual. */}
            {!connected && <EmbeddedSignup />}

            <ManualConnect defaultOpen={connected}>
              <MetaGuide />

              <form action={formAction} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phoneNumberId">ID do número de telefone (phone_number_id)</Label>
                  <Input
                    id="phoneNumberId"
                    name="phoneNumberId"
                    defaultValue={phoneNumberId ?? ''}
                    placeholder="123456789012345"
                    required
                  />
                  <p className="text-muted-foreground text-xs">
                    É um número longo (15+ dígitos), <strong>não</strong> é o telefone do WhatsApp.
                    Na Meta: WhatsApp → Configuração da API, logo abaixo do número selecionado.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accessToken">Token de acesso (access_token)</Label>
                  <Input
                    id="accessToken"
                    name="accessToken"
                    type="password"
                    placeholder="EAAB…"
                    required
                  />
                  <p className="text-muted-foreground text-xs">
                    É o que autoriza o bot a enviar mensagens pelo seu número. Começa com{' '}
                    <code>EAA</code>. Para testar, use o token temporário (24h) que aparece em
                    Configuração da API. Em produção, gere um token permanente de um System User com
                    a permissão <code>whatsapp_business_messaging</code>.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessAccountId">
                    ID da conta WhatsApp Business (WABA ID) - opcional
                  </Label>
                  <Input
                    id="businessAccountId"
                    name="businessAccountId"
                    defaultValue={businessAccountId ?? ''}
                    placeholder="123456789012345"
                  />
                  <p className="text-muted-foreground text-xs">
                    É o ID da <strong>conta WhatsApp Business</strong>, que agrupa os seus números.{' '}
                    <strong>Não confunda</strong> com o ID do Aplicativo (App ID) nem com o
                    phone_number_id. Na Meta: WhatsApp → Configuração da API, no topo, campo{' '}
                    <strong>WhatsApp Business Account ID</strong>. Não é obrigatório para o bot
                    funcionar - pode deixar em branco.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="displayPhone">Telefone público - opcional</Label>
                  <Input
                    id="displayPhone"
                    name="displayPhone"
                    defaultValue={displayPhone ?? ''}
                    placeholder="5511987654321"
                  />
                  <p className="text-muted-foreground text-xs">
                    O número que aparece para os clientes, usado no link <code>wa.me/...</code> da
                    sua página pública. Só dígitos, com DDI e DDD, sem +, espaços ou parênteses
                    (ex.: 5519936195726).
                  </p>
                </div>

                {state && 'error' in state && (
                  <p className="text-destructive text-sm">{state.error}</p>
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
            </ManualConnect>
          </>
        )}
      </CardContent>
    </Card>
  );
}
