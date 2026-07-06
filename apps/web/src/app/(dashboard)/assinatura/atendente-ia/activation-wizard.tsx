'use client';

import type { AddonTier } from '@haru/database';
import { formatBRL } from '@haru/shared';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Share2,
  Sparkles,
  Store,
} from 'lucide-react';
import Link from 'next/link';
import { useActionState, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { activateAddon, type ActivateAddonResult } from '../actions';

export interface AddonOffer {
  tier: AddonTier;
  name: string;
  priceMonthlyCents: number;
  conversationsPerMonth: number | null;
  setupFeeCents: number;
}

type Channel = 'DEMANDAE' | 'OWN';

const CHANNELS: {
  key: Channel;
  title: string;
  icon: typeof Store;
  pitch: string;
  pros: string[];
  cons: string;
}[] = [
  {
    key: 'DEMANDAE',
    title: 'Número do Demandaê',
    icon: Sparkles,
    pitch: 'O bot atende no nosso número e se apresenta como o seu estabelecimento.',
    pros: ['Ativa na hora, sem configuração', 'Sem custo de setup', 'Zero burocracia com a Meta'],
    cons: 'O número é compartilhado - não é o seu. Você divulga um link pronto pros clientes.',
  },
  {
    key: 'OWN',
    title: 'Seu próprio número',
    icon: Store,
    pitch: 'O bot atende no WhatsApp oficial do seu estabelecimento.',
    pros: ['Seu número, sua marca', 'Cliente fala com o número que já conhece'],
    cons: 'Exige configurar a conta oficial na Meta - nossa equipe cuida disso. Setup único de R$ 1.497 e leva alguns dias.',
  },
];

export function ActivationWizard({
  offers,
  defaultDisplayName,
}: {
  offers: AddonOffer[];
  defaultDisplayName: string;
}) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [tier, setTier] = useState<AddonTier>(offers[0]?.tier ?? 'BOT_SOLO');
  const [displayName, setDisplayName] = useState(defaultDisplayName);
  const [tone, setTone] = useState('');
  const [greeting, setGreeting] = useState('');

  const [state, formAction, pending] = useActionState<ActivateAddonResult | undefined, FormData>(
    activateAddon,
    undefined,
  );

  const selected = useMemo(() => offers.find((o) => o.tier === tier), [offers, tier]);
  const ok = state && 'ok' in state ? state : null;
  const error = state && 'error' in state ? state.error : null;

  if (ok) return <SuccessCard result={ok} />;

  function submit() {
    if (!channel) return;
    const fd = new FormData();
    fd.set('addonTier', tier);
    fd.set('channel', channel);
    fd.set('botDisplayName', displayName.trim());
    fd.set('botTone', tone.trim());
    fd.set('botGreeting', greeting.trim());
    formAction(fd);
  }

  return (
    <div className="space-y-6">
      <Stepper step={step} />

      {step === 0 && (
        <div className="space-y-6">
          {/* Canal */}
          <div className="space-y-3">
            <h2 className="font-medium">Como seus clientes vão falar com o bot?</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {CHANNELS.map((c) => {
                const Icon = c.icon;
                const active = channel === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setChannel(c.key)}
                    className={`flex flex-col rounded-2xl border p-4 text-left transition-colors ${
                      active
                        ? 'border-foreground ring-foreground ring-1'
                        : 'hover:border-foreground/40'
                    }`}
                  >
                    <span className="flex items-center gap-2 font-semibold">
                      <Icon className="text-coral size-4 shrink-0" aria-hidden />
                      {c.title}
                    </span>
                    <span className="text-muted-foreground mt-1 text-sm">{c.pitch}</span>
                    <ul className="mt-3 space-y-1">
                      {c.pros.map((p) => (
                        <li key={p} className="flex items-start gap-1.5 text-sm">
                          <Check
                            className="text-green-bright mt-0.5 size-3.5 shrink-0"
                            strokeWidth={3}
                            aria-hidden
                          />
                          {p}
                        </li>
                      ))}
                    </ul>
                    <span className="text-muted-foreground mt-3 border-t pt-2 text-xs">{c.cons}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tier */}
          <div className="space-y-3">
            <h2 className="font-medium">Quanta conversa você espera por mês?</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {offers.map((o) => {
                const active = tier === o.tier;
                return (
                  <button
                    key={o.tier}
                    type="button"
                    onClick={() => setTier(o.tier)}
                    className={`rounded-xl border p-4 text-left transition-colors ${
                      active
                        ? 'border-foreground ring-foreground ring-1'
                        : 'hover:border-foreground/40'
                    }`}
                  >
                    <p className="text-sm font-semibold">{o.name}</p>
                    <p className="mt-1 font-serif text-lg font-semibold tabular-nums">
                      +{formatBRL(o.priceMonthlyCents)}
                      <span className="text-muted-foreground text-xs font-normal">/mês</span>
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {o.conversationsPerMonth
                        ? `Até ${o.conversationsPerMonth.toLocaleString('pt-BR')} conversas/mês`
                        : 'Conversas ilimitadas'}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="button" disabled={!channel} onClick={() => setStep(1)}>
              Continuar
            </Button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <div>
            <h2 className="font-medium">Como o bot deve se apresentar?</h2>
            <p className="text-muted-foreground text-sm">
              {channel === 'DEMANDAE'
                ? 'No número compartilhado, isso é essencial pro cliente saber que fala com você.'
                : 'Personalize o jeito do seu atendente conversar.'}
            </p>
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="displayName">Nome do estabelecimento (como o bot se apresenta)</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ex.: Barbearia do Téo"
                maxLength={80}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tone">Tom de voz (opcional)</Label>
              <Input
                id="tone"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                placeholder="Ex.: descontraído e direto"
                maxLength={200}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="greeting">Saudação de abertura (opcional)</Label>
              <Input
                id="greeting"
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                placeholder="Ex.: Opa! Aqui é da Barbearia do Téo, bora agendar?"
                maxLength={500}
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Button type="button" variant="ghost" onClick={() => setStep(0)}>
              <ArrowLeft className="size-4" /> Voltar
            </Button>
            <Button type="button" onClick={() => setStep(2)} disabled={!displayName.trim()}>
              Continuar
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <h2 className="font-medium">Confira e ative</h2>
          <div className="bg-card space-y-3 rounded-2xl border p-5 text-sm">
            <Row label="Canal" value={channel === 'DEMANDAE' ? 'Número do Demandaê' : 'Seu próprio número'} />
            <Row label="Plano" value={`${selected?.name ?? ''}`} />
            <Row
              label="Mensalidade"
              value={`+${formatBRL(selected?.priceMonthlyCents ?? 0)}/mês`}
            />
            {channel === 'OWN' && (
              <Row
                label="Setup (único)"
                value={formatBRL(selected?.setupFeeCents ?? 0)}
                highlight
              />
            )}
            <Row label="Apresentação" value={displayName.trim() || '-'} />
          </div>

          {channel === 'DEMANDAE' ? (
            <p className="text-muted-foreground text-sm">
              Ao ativar, seu atendente entra no ar na hora. A mensalidade é somada ao seu plano e o 1º
              período é cobrado proporcional aos dias que faltam no ciclo.
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">
              Primeiro você paga o setup. Só depois começamos a configurar a conta oficial no WhatsApp
              (Meta) - a mensalidade só passa a contar quando seu atendente estiver no ar. Reembolso
              integral do setup se cancelar em até 30 dias.
            </p>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center justify-between">
            <Button type="button" variant="ghost" onClick={() => setStep(1)} disabled={pending}>
              <ArrowLeft className="size-4" /> Voltar
            </Button>
            <Button type="button" variant="coral" onClick={submit} disabled={pending}>
              {pending
                ? 'Processando…'
                : channel === 'DEMANDAE'
                  ? 'Ativar agora'
                  : `Pagar setup de ${formatBRL(selected?.setupFeeCents ?? 0)}`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={highlight ? 'font-semibold tabular-nums' : 'tabular-nums'}>{value}</span>
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  const labels = ['Canal e plano', 'Apresentação', 'Ativar'];
  return (
    <ol className="flex items-center gap-2 text-xs">
      {labels.map((l, i) => (
        <li key={l} className="flex items-center gap-2">
          <span
            className={`flex size-5 items-center justify-center rounded-full text-[11px] font-semibold ${
              i <= step ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'
            }`}
          >
            {i + 1}
          </span>
          <span className={i <= step ? 'font-medium' : 'text-muted-foreground'}>{l}</span>
          {i < labels.length - 1 && <span className="text-muted-foreground/40">›</span>}
        </li>
      ))}
    </ol>
  );
}

/** Tela de sucesso após activateAddon. Diferencia número Demandaê (link pronto) de próprio (setup a pagar). */
function SuccessCard({ result }: { result: Extract<ActivateAddonResult, { ok: true }> }) {
  const [copied, setCopied] = useState(false);

  if (result.channel === 'OWN') {
    return (
      <div className="bg-card space-y-4 rounded-2xl border p-6">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="text-green-deep size-5" aria-hidden />
          <h2 className="font-medium">Setup gerado - falta o pagamento</h2>
        </div>
        <p className="text-muted-foreground text-sm">
          Assim que o pagamento do setup for confirmado, nossa equipe começa a configurar a sua conta
          oficial no WhatsApp e avisa você. A mensalidade só passa a contar quando estiver no ar.
        </p>
        {result.invoiceUrl && (
          <Button asChild variant="coral">
            <a href={result.invoiceUrl} target="_blank" rel="noreferrer">
              Pagar o setup <ExternalLink className="size-4" />
            </a>
          </Button>
        )}
        <p className="text-muted-foreground text-xs">
          Você pode acompanhar o status na página de <Link href="/assinatura" className="underline">assinatura</Link>.
        </p>
      </div>
    );
  }

  // DEMANDAE
  return (
    <div className="bg-card space-y-4 rounded-2xl border p-6">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="text-green-deep size-5" aria-hidden />
        <h2 className="font-medium">Seu Atendente IA está no ar 🎉</h2>
      </div>
      <p className="text-muted-foreground text-sm">
        Compartilhe este link com seus clientes: quem tocar nele já cai na conversa com o seu
        atendente, pronto pra agendar.
      </p>
      {result.waLink ? (
        <div className="flex items-center gap-2">
          <code className="bg-muted flex-1 truncate rounded px-2 py-2 text-xs">{result.waLink}</code>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => {
              navigator.clipboard.writeText(result.waLink!).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              });
            }}
          >
            <Copy className="size-3.5" /> {copied ? 'Copiado' : 'Copiar'}
          </Button>
        </div>
      ) : (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          Seu atendente está ativo, mas o link de compartilhamento ainda não está configurado. Fale
          com o suporte pra pegar o número.
        </p>
      )}
      {result.invoiceUrl && (
        <p className="text-muted-foreground text-sm">
          Há uma cobrança proporcional do 1º ciclo -{' '}
          <a href={result.invoiceUrl} target="_blank" rel="noreferrer" className="underline">
            pagar agora
          </a>
          .
        </p>
      )}
      <div className="flex flex-wrap gap-2 pt-1">
        {result.waLink && (
          <Button asChild variant="coral">
            <a href={result.waLink} target="_blank" rel="noreferrer">
              <Share2 className="size-4" /> Testar o link
            </a>
          </Button>
        )}
        <Button asChild variant="outline">
          <Link href="/conversations">Ver conversas</Link>
        </Button>
      </div>
    </div>
  );
}
