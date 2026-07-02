'use client';

import type { PlanTier } from '@haru/database';
import { useActionState, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SETUP_FEE_CENTS } from '@/lib/billing/pricing';

import { subscribe, type CheckoutResult } from './actions';

export interface PlanOption {
  tier: PlanTier;
  name: string;
  priceMonthlyCents: number;
  priceAnnualCents: number;
}

type Cycle = 'MONTHLY' | 'ANNUAL';
type Method = 'CARD' | 'PIX';

function fmtBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function SubscribeForm({
  plans,
  currentTier,
  preselectedTier,
  currentStatus,
  setupAlreadyCharged = false,
}: {
  plans: PlanOption[];
  currentTier: PlanTier | null;
  preselectedTier?: PlanTier | null;
  currentStatus: string | null;
  /** Setup já quitado/coberto - não reoferecer o checkbox (espelha o guard do server). */
  setupAlreadyCharged?: boolean;
}) {
  const [tier, setTier] = useState<PlanTier>(
    currentTier ?? preselectedTier ?? plans[0]?.tier ?? 'ESSENCIAL',
  );
  const [cycle, setCycle] = useState<Cycle>('MONTHLY');
  const [method, setMethod] = useState<Method>('CARD');
  const [state, formAction, pending] = useActionState<CheckoutResult | undefined, FormData>(
    subscribe,
    undefined,
  );

  const [wantsSetup, setWantsSetup] = useState(false);
  const selected = plans.find((p) => p.tier === tier) ?? plans[0];
  // Setup é opcional e só na 1ª contratação mensal (espelha a regra do server action).
  const firstContract = currentStatus === null || currentStatus === 'PENDING';
  const setupOffered = cycle === 'MONTHLY' && firstContract && !setupAlreadyCharged;
  const setupApplies = setupOffered && wantsSetup;
  const error = state && 'error' in state ? state.error : null;
  const pixOk = state && 'ok' in state && state.method === 'PIX' ? state : null;
  const cardOk = state && 'ok' in state && state.method === 'CARD' ? state : null;

  // Cartão: redireciona pra fatura hospedada do Asaas (o cartão é digitado lá, não aqui).
  useEffect(() => {
    if (cardOk) window.location.href = cardOk.checkoutUrl;
  }, [cardOk]);

  if (cardOk) {
    return (
      <div className="bg-card space-y-3 rounded-xl border p-6 text-sm">
        <p className="font-medium">Redirecionando para o pagamento seguro…</p>
        <p className="text-muted-foreground">
          Se não abrir automaticamente,{' '}
          <a className="underline" href={cardOk.checkoutUrl}>
            clique aqui
          </a>{' '}
          para digitar os dados do cartão no ambiente do Asaas.
        </p>
      </div>
    );
  }

  if (pixOk) {
    return (
      <div className="bg-card space-y-4 rounded-xl border p-6">
        <div>
          <p className="font-medium">Quase lá - pague o Pix para ativar</p>
          <p className="text-muted-foreground text-sm">
            Assim que o pagamento for confirmado, sua assinatura ativa automaticamente.
          </p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={pixOk.pixQrCode} alt="QR Code Pix" className="mx-auto h-56 w-56" />
        <div>
          <Label htmlFor="pixcopy">Pix copia-e-cola</Label>
          <textarea
            id="pixcopy"
            readOnly
            value={pixOk.pixCopyPaste}
            className="bg-muted/30 mt-1 h-24 w-full rounded-md border p-2 text-xs"
          />
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="bg-card space-y-6 rounded-xl border p-6">
      {currentStatus === 'ACTIVE' && (
        <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-900">
          Você já tem uma assinatura ativa. Contratar de novo troca o plano/forma de pagamento.
        </p>
      )}

      {/* Ciclo */}
      <div className="flex gap-2">
        {(['MONTHLY', 'ANNUAL'] as Cycle[]).map((c) => (
          <button
            type="button"
            key={c}
            onClick={() => setCycle(c)}
            className={`rounded-md border px-3 py-1.5 text-sm ${
              cycle === c ? 'bg-foreground text-background' : 'bg-background'
            }`}
          >
            {c === 'MONTHLY' ? 'Mensal' : 'Anual (2 meses grátis)'}
          </button>
        ))}
      </div>

      {/* Planos */}
      <div className="space-y-2">
        {plans.map((p) => {
          const price = cycle === 'ANNUAL' ? p.priceAnnualCents : p.priceMonthlyCents;
          return (
            <label
              key={p.tier}
              className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 ${
                tier === p.tier ? 'border-foreground ring-foreground ring-1' : ''
              }`}
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name="tierRadio"
                  checked={tier === p.tier}
                  onChange={() => setTier(p.tier)}
                />
                <span className="font-medium">{p.name}</span>
              </span>
              <span className="text-sm">
                {fmtBRL(price)}
                <span className="text-muted-foreground">/{cycle === 'ANNUAL' ? 'ano' : 'mês'}</span>
              </span>
            </label>
          );
        })}
      </div>

      {/* Campos enviados */}
      <input type="hidden" name="tier" value={tier} />
      <input type="hidden" name="cycle" value={cycle} />
      <input type="hidden" name="method" value={method} />

      <div>
        <Label htmlFor="cpfCnpj">CPF/CNPJ do responsável pela cobrança</Label>
        <Input
          id="cpfCnpj"
          name="cpfCnpj"
          inputMode="numeric"
          placeholder="Somente números"
          required
        />
      </div>

      {/* Forma de pagamento */}
      <div className="flex gap-2">
        {(['CARD', 'PIX'] as Method[]).map((m) => (
          <button
            type="button"
            key={m}
            onClick={() => setMethod(m)}
            className={`rounded-md border px-3 py-1.5 text-sm ${
              method === m ? 'bg-foreground text-background' : 'bg-background'
            }`}
          >
            {m === 'CARD' ? 'Cartão (recorrente)' : 'Pix'}
          </button>
        ))}
      </div>

      <p className="text-muted-foreground text-xs">
        {method === 'CARD'
          ? 'Você será levado ao ambiente seguro do Asaas para digitar o cartão. Não armazenamos os dados do cartão.'
          : 'Geramos um Pix; a assinatura ativa assim que o pagamento for confirmado.'}
      </p>

      {/* Config assistida do WhatsApp: opcional (o WhatsApp é opcional). Só no mensal. */}
      {setupOffered && (
        <label className="flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm">
          <input
            type="checkbox"
            name="wantsSetup"
            checked={wantsSetup}
            onChange={(e) => setWantsSetup(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            <span className="font-medium">
              Configuração assistida do WhatsApp (+{fmtBRL(SETUP_FEE_CENTS)})
            </span>
            <span className="text-muted-foreground block text-xs">
              Opcional. Nosso time conecta seu WhatsApp à Meta pra você. Dá pra ativar depois, se
              preferir - ou usar só a agenda, o painel e o app do cliente.
            </span>
          </span>
        </label>
      )}

      {/* Resumo do setup - transparência: o setup entra na 1ª cobrança mensal. */}
      {setupApplies && selected && (
        <div className="bg-muted/20 space-y-1 rounded-lg border p-3 text-sm">
          <div className="flex justify-between">
            <span>Plano {selected.name} (1º mês)</span>
            <span>{fmtBRL(selected.priceMonthlyCents)}</span>
          </div>
          <div className="flex justify-between">
            <span>Configuração assistida (setup único)</span>
            <span>{fmtBRL(SETUP_FEE_CENTS)}</span>
          </div>
          <div className="flex justify-between border-t pt-1 font-semibold">
            <span>1ª cobrança</span>
            <span>{fmtBRL(selected.priceMonthlyCents + SETUP_FEE_CENTS)}</span>
          </div>
          <p className="text-muted-foreground pt-0.5 text-xs">
            Depois {fmtBRL(selected.priceMonthlyCents)}/mês. O setup é grátis no plano anual.
          </p>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" disabled={pending} className="w-full">
        {pending
          ? 'Processando…'
          : method === 'CARD'
            ? `Assinar ${selected?.name ?? ''}`
            : 'Gerar Pix'}
      </Button>
    </form>
  );
}
