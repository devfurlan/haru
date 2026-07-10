'use client';

import { ChevronDown, Copy } from 'lucide-react';
import { useActionState, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';

import type { PaymentProvider } from '@haru/database';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import {
  connectPaymentGateway,
  disconnectPaymentGateway,
  type PaymentsActionResult,
} from './actions';

interface PaymentsCardProps {
  provider: PaymentProvider | null;
  sandbox: boolean;
  hasCredential: boolean;
  /** URL base pública pra montar o endpoint de webhook exibido no guia. */
  webhookBaseUrl: string;
}

/** Metadados de cada gateway: rótulo, status de implementação e rótulo da credencial. */
const PROVIDERS: Record<
  PaymentProvider,
  { label: string; ready: boolean; credentialLabel: string; placeholder: string }
> = {
  ASAAS: {
    label: 'Asaas',
    ready: true,
    credentialLabel: 'Chave de API (API Key)',
    placeholder: '$aact_…',
  },
  MERCADO_PAGO: {
    label: 'Mercado Pago',
    ready: false,
    credentialLabel: 'Access Token',
    placeholder: 'APP_USR-…',
  },
  PAGBANK: {
    label: 'PagSeguro / PagBank',
    ready: false,
    credentialLabel: 'Token de API',
    placeholder: 'Token do PagBank',
  },
  PAGARME: {
    label: 'Pagar.me',
    ready: false,
    credentialLabel: 'Secret Key',
    placeholder: 'sk_…',
  },
};

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
      <code className="bg-cream-2 flex-1 break-all rounded px-2 py-1 text-xs">{value}</code>
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

function AsaasGuide({ webhookUrl }: { webhookUrl: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-edge bg-cream-2/40 rounded-xl border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-ink flex w-full items-center justify-between p-3 text-left text-sm font-semibold"
      >
        Como conectar o Asaas (passo a passo)
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-edge space-y-4 border-t p-4 text-sm">
          <ol className="space-y-3">
            <li>
              <p className="text-ink font-semibold">1. Crie a conta e pegue a chave de API</p>
              <p className="text-ink-50">
                No painel do{' '}
                <a
                  href="https://www.asaas.com"
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2"
                >
                  Asaas
                </a>
                : <strong>Configurações → Integrações → Chave de API</strong>. Copie a chave (começa
                com <code>$aact_</code>) e cole no campo abaixo. Para testar, use uma conta sandbox
                e marque <strong>Modo de testes</strong>.
              </p>
            </li>
            <li>
              <p className="text-ink font-semibold">2. Cadastre o webhook de pagamentos</p>
              <p className="text-ink-50">
                Ainda em <strong>Integrações → Webhooks</strong>, adicione um webhook com esta URL:
              </p>
              <div className="mt-1.5">
                <CopyField value={webhookUrl} />
              </div>
              <p className="text-ink-50 mt-1.5">
                Defina um <strong>Token de autenticação</strong> no Asaas e cole o mesmo valor no
                campo &quot;Token do webhook&quot; abaixo - é o que garante que só o Asaas confirma
                pagamentos.
              </p>
            </li>
            <li>
              <p className="text-ink font-semibold">3. Selecione os eventos de Cobranças</p>
              <p className="text-ink-50">
                Na seção <strong>Adicionar Eventos</strong> do mesmo webhook, abra{' '}
                <strong>Cobranças</strong> e clique em <strong>Selecionar Todos</strong>. É essa
                categoria que avisa quando uma cobrança é{' '}
                <strong>confirmada, recebida, vencida, estornada ou removida</strong> - sem ela, o
                pagamento nunca é confirmado aqui. As outras categorias (Notas fiscais,
                Transferências etc.) podem ficar desmarcadas.
              </p>
              <p className="text-ink-50 mt-1.5">
                Mantenha <strong>&quot;Este Webhook ficará ativo?&quot;</strong> ligado e clique em{' '}
                <strong>Salvar</strong>.
              </p>
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}

export function PaymentsCard({
  provider,
  sandbox,
  hasCredential,
  webhookBaseUrl,
}: PaymentsCardProps) {
  const connected = Boolean(provider && hasCredential);
  // Recolhido por padrão (visão do protótipo): só badge + botão "Conectar Asaas".
  const [showForm, setShowForm] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider>(provider ?? 'ASAAS');
  const [state, formAction] = useActionState<PaymentsActionResult | undefined, FormData>(
    connectPaymentGateway,
    undefined,
  );
  const [disconnectPending, startDisconnect] = useTransition();

  if (state && 'ok' in state && showForm) {
    setShowForm(false);
  }

  const meta = PROVIDERS[selectedProvider];
  const webhookUrl = `${webhookBaseUrl}/api/webhooks/payments/${selectedProvider.toLowerCase()}`;

  return (
    <div className="border-line bg-paper shadow-soft rounded-[18px] border p-[18px]">
      <div className="flex items-center gap-2.5">
        <div className="flex-1">
          <div className="text-ink font-serif text-[16px] font-semibold">Pagamentos</div>
          <div className="text-ink-50 mt-0.5 text-[12px] font-medium">
            Pix ou cartão logo após o agendamento. Opcional - não trava a agenda.
          </div>
        </div>
        {connected ? (
          <Badge variant="success">
            <span className="bg-green-bright size-1.5 rounded-full" />
            Conectado
          </Badge>
        ) : (
          <Badge variant="pending">Não conectado</Badge>
        )}
      </div>

      {/* Recolhido, não conectado: só o botão de conectar. */}
      {!showForm && !connected && (
        <Button variant="secondary" className="mt-3.5 h-11" onClick={() => setShowForm(true)}>
          Conectar Asaas
        </Button>
      )}

      {/* Recolhido, conectado: resumo + editar/desconectar. */}
      {!showForm && connected && provider && (
        <div className="mt-3.5 space-y-2 text-sm">
          <div>
            <span className="text-ink-50">Gateway: </span>
            <span className="text-ink font-semibold">{PROVIDERS[provider].label}</span>
          </div>
          <div>
            <span className="text-ink-50">Modo: </span>
            <span className="text-ink font-semibold">
              {sandbox ? 'Testes (sandbox)' : 'Produção'}
            </span>
          </div>
          <div className="text-ink-50">credencial: ••••••••</div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
              Editar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={disconnectPending}
              onClick={() => {
                if (!window.confirm('Desconectar o gateway de pagamento?')) return;
                startDisconnect(() => disconnectPaymentGateway().then(() => setShowForm(false)));
              }}
            >
              {disconnectPending ? 'Desconectando…' : 'Desconectar'}
            </Button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="mt-3.5 space-y-4">
          {selectedProvider === 'ASAAS' && <AsaasGuide webhookUrl={webhookUrl} />}

          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="provider">Gateway</Label>
              <select
                id="provider"
                name="provider"
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value as PaymentProvider)}
                className="border-input ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2"
              >
                {(Object.keys(PROVIDERS) as PaymentProvider[]).map((key) => (
                  <option key={key} value={key}>
                    {PROVIDERS[key].label}
                    {PROVIDERS[key].ready ? '' : ' (em breve)'}
                  </option>
                ))}
              </select>
              {!meta.ready && (
                <p className="text-xs text-amber-700">
                  {meta.label} ainda não está disponível para cobranças - por enquanto, use o Asaas.
                  Você pode salvar a credencial, mas o botão de pagar mostrará um aviso.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="credential">{meta.credentialLabel}</Label>
              <Input
                id="credential"
                name="credential"
                type="password"
                placeholder={connected ? 'Deixe em branco para manter a atual' : meta.placeholder}
                // Na edição, em branco mantém a credencial salva; só é obrigatória ao conectar.
                required={!connected}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="webhookToken">Token do webhook - opcional, recomendado</Label>
              <Input
                id="webhookToken"
                name="webhookToken"
                type="password"
                placeholder={connected ? 'Deixe em branco para manter o atual' : '••••••'}
              />
              <p className="text-ink-50 text-xs">
                Mesmo valor configurado no painel do gateway. Validamos esse token no recebimento da
                confirmação de pagamento.
                {connected ? ' Em branco mantém o token já salvo.' : ''}
              </p>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="sandbox"
                defaultChecked={sandbox}
                className="border-input accent-green-deep h-4 w-4 rounded border"
              />
              Modo de testes (sandbox)
            </label>

            {state && 'error' in state && <p className="text-destructive text-sm">{state.error}</p>}

            <div className="flex gap-2">
              <SubmitButton editing={connected} />
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
