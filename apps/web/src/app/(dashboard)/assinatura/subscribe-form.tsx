'use client';

import type { PlanTier } from '@haru/database';
import { useActionState, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { subscribe, type CheckoutResult } from './actions';

export interface PlanOption {
  tier: PlanTier;
  name: string;
  priceMonthlyCents: number;
  priceAnnualCents: number;
  /** Valor de CADA parcela no anual 12x (taxas de parcelamento já repassadas). */
  priceAnnualInstallmentCents: number;
}

type Cycle = 'MONTHLY' | 'ANNUAL' | 'ANNUAL_INSTALLMENTS';
type Method = 'CARD' | 'PIX';

const CYCLE_LABEL: Record<Cycle, string> = {
  MONTHLY: 'Mensal',
  ANNUAL: 'Anual à vista',
  ANNUAL_INSTALLMENTS: 'Anual 12x',
};

function fmtBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function SubscribeForm({
  plans,
  currentTier,
  preselectedTier,
  currentStatus,
}: {
  plans: PlanOption[];
  currentTier: PlanTier | null;
  preselectedTier?: PlanTier | null;
  currentStatus: string | null;
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

  const selected = plans.find((p) => p.tier === tier) ?? plans[0];

  // Tudo derivado das colunas do plano (fonte de verdade); nada hardcodado. A parcela do
  // 12x já traz as taxas de parcelamento embutidas, por isso 12x o valor total > à vista.
  const monthlyCents = selected?.priceMonthlyCents ?? 0;
  const annualCents = selected?.priceAnnualCents ?? 0;
  const installmentCents = selected?.priceAnnualInstallmentCents ?? 0;
  const installmentTotalCents = installmentCents * 12;
  const annualCashSavingCents = monthlyCents * 12 - annualCents; // economia do à vista vs mensal
  const cheaperThanMonthly = installmentCents > 0 && installmentCents < monthlyCents;
  // 12x só faz sentido no cartão (parcelamento não existe em Pix) e só se o plano tiver preço.
  const twelveXEnabled = installmentCents > 0 && method === 'CARD';
  const isAnnual = cycle === 'ANNUAL' || cycle === 'ANNUAL_INSTALLMENTS';

  // Escolheu 12x e depois trocou pra um método sem parcelamento: volta pro anual à vista.
  useEffect(() => {
    if (cycle === 'ANNUAL_INSTALLMENTS' && !twelveXEnabled) setCycle('ANNUAL');
  }, [cycle, twelveXEnabled]);

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

      {/* Ciclo: mensal x anual. O anual abre a comparação à vista / 12x abaixo. */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setCycle('MONTHLY')}
          className={`rounded-md border px-3 py-1.5 text-sm ${
            cycle === 'MONTHLY' ? 'bg-foreground text-background' : 'bg-background'
          }`}
        >
          Mensal
        </button>
        <button
          type="button"
          onClick={() => setCycle('ANNUAL')}
          className={`rounded-md border px-3 py-1.5 text-sm ${
            isAnnual ? 'bg-foreground text-background' : 'bg-background'
          }`}
        >
          Anual (2 meses grátis)
        </button>
      </div>

      {/* Comparação à vista x 12x (só no anual). Cada card seleciona o ciclo. */}
      {isAnnual && selected && (
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setCycle('ANNUAL')}
            className={`rounded-xl border p-4 text-left transition-colors ${
              cycle === 'ANNUAL' ? 'border-primary ring-primary ring-1' : 'hover:bg-muted/40'
            }`}
          >
            <p className="text-muted-foreground text-xs font-medium">Anual à vista</p>
            <p className="font-serif text-xl font-semibold tabular-nums">
              {fmtBRL(annualCents)}
              <span className="text-muted-foreground text-sm font-normal">/ano</span>
            </p>
            {annualCashSavingCents > 0 && (
              <p className="mt-1 text-xs text-emerald-700">
                Economia de {fmtBRL(annualCashSavingCents)} no ano
              </p>
            )}
          </button>

          <button
            type="button"
            disabled={!twelveXEnabled}
            onClick={() => setCycle('ANNUAL_INSTALLMENTS')}
            className={`rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              cycle === 'ANNUAL_INSTALLMENTS'
                ? 'border-primary ring-primary ring-1'
                : 'enabled:hover:bg-muted/40'
            }`}
          >
            <p className="text-muted-foreground text-xs font-medium">Anual 12x no cartão</p>
            <p className="font-serif text-xl font-semibold tabular-nums">
              {fmtBRL(installmentCents)}
              <span className="text-muted-foreground text-sm font-normal">/mês</span>
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              12x de {fmtBRL(installmentCents)} · total {fmtBRL(installmentTotalCents)}
            </p>
            {cheaperThanMonthly && (
              <p className="text-coral mt-1 text-xs font-semibold">
                Mais barato que o mensal de {fmtBRL(monthlyCents)}
              </p>
            )}
            {!twelveXEnabled && installmentCents > 0 && (
              <p className="text-muted-foreground mt-1 text-xs">Disponível no cartão de crédito</p>
            )}
          </button>

          {cycle === 'ANNUAL_INSTALLMENTS' && (
            <p className="text-muted-foreground sm:col-span-2 text-xs">
              As taxas de parcelamento já estão incluídas na parcela e são repassadas ao cliente -
              nada é cobrado à parte.
            </p>
          )}
        </div>
      )}

      {/* Planos */}
      <div className="space-y-2">
        {plans.map((p) => {
          const price =
            cycle === 'ANNUAL'
              ? p.priceAnnualCents
              : cycle === 'ANNUAL_INSTALLMENTS'
                ? p.priceAnnualInstallmentCents
                : p.priceMonthlyCents;
          const priceSuffix = cycle === 'ANNUAL' ? '/ano' : '/mês';
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
                <span className="text-muted-foreground">{priceSuffix}</span>
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
