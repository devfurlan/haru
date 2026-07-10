'use client';

import type { BillingCycle, PaymentMethod, PlanTier, SubscriptionStatus } from '@haru/database';
import { formatBRL } from '@haru/shared';
import {
  AlertTriangle,
  ArrowUpRight,
  BellOff,
  Check,
  Clock,
  CreditCard,
  QrCode,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useMemo, useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  cardLast4 as extractLast4,
  isCardComplete,
  maskCardNumber,
  maskCep,
  maskCvv,
  maskExpiry,
} from '@/lib/card-format';

import {
  cancelSubscription,
  changePaymentMethod,
  changePlan,
  deactivateAddon,
  reactivateSubscription,
  type ManageResult,
} from './actions';
import type { PlanOption } from './subscribe-form';

type Cycle = 'MONTHLY' | 'ANNUAL';

export interface UsageView {
  used: number;
  /** null = ilimitado. */
  limit: number | null;
  pct: number | null;
}

export interface AddonOffer {
  name: string;
  priceMonthlyCents: number;
  conversationsPerMonth: number | null;
  setupFeeCents: number;
}

interface BillingDashboardProps {
  currentTier: PlanTier;
  currentPlanName: string;
  currentCycle: BillingCycle;
  status: SubscriptionStatus;
  /** Forma de pagamento ativa da recorrência. null = ainda não definida/legado. */
  paymentMethod: PaymentMethod | null;
  /** Últimos 4 + bandeira do cartão (só exibição). null quando é Pix/legado. */
  cardLast4: string | null;
  cardBrand: string | null;
  /** Valor da próxima cobrança (snapshot do ciclo contratado), em centavos. */
  priceCents: number;
  nextChargeISO: string | null;
  guaranteeUntilISO: string | null;
  plans: PlanOption[];
  appointments: UsageView;
  /** Uso de conversas do bot - só quando o addon está ativo. */
  conversations: UsageView | null;
  addonActive: boolean;
  addonName: string | null;
  /** Addon com desativação já agendada (vale no fim do ciclo). */
  addonDeactivateScheduled: boolean;
  /** Número próprio escolhido mas ainda não ativo: aguardando pagamento do setup ou a
   *  verificação/config da WABA pela equipe. null = sem addon pendente. */
  addonPending: 'setup_payment' | 'verification' | null;
  addonOffer: AddonOffer[];
  /** Downgrade agendado a aplicar no próximo ciclo, se houver. */
  pendingChange: { planName: string; cycleLabel: string } | null;
}

const CYCLE_LABEL: Record<BillingCycle, string> = {
  MONTHLY: 'Mensal',
  ANNUAL: 'Anual à vista',
  ANNUAL_INSTALLMENTS: 'Anual 12x',
};

const STATUS_PILL: Record<SubscriptionStatus, { label: string; className: string }> = {
  ACTIVE: { label: 'Ativa', className: 'bg-emerald-100 text-emerald-800 ring-emerald-300' },
  PAST_DUE: { label: 'Pagamento em atraso', className: 'bg-red-100 text-red-800 ring-red-300' },
  PENDING: {
    label: 'Aguardando pagamento',
    className: 'bg-amber-100 text-amber-900 ring-amber-300',
  },
  SUSPENDED: { label: 'Suspensa', className: 'bg-red-100 text-red-800 ring-red-300' },
  CANCELED: { label: 'Cancelada', className: 'bg-slate-200 text-slate-700 ring-slate-300' },
};

function fmtDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Cor da barra de uso conforme o limiar atingido (85/90/95/100%). */
function barColor(pct: number | null): string {
  if (pct == null) return 'bg-green-bright';
  if (pct >= 100) return 'bg-red-500';
  if (pct >= 90) return 'bg-red-400';
  if (pct >= 85) return 'bg-amber-400';
  return 'bg-green-bright';
}

function UsageBar({ label, m }: { label: string; m: UsageView }) {
  const alerting = m.pct != null && m.pct >= 85;
  const width = m.pct == null ? 0 : Math.min(m.pct, 100);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 font-medium">
          {alerting && <AlertTriangle className="size-3.5 text-amber-600" aria-hidden />}
          {label}
        </span>
        <span className="text-muted-foreground tabular-nums">
          {m.limit == null ? (
            <>{m.used.toLocaleString('pt-BR')} · ilimitado</>
          ) : (
            <>
              {m.used.toLocaleString('pt-BR')} / {m.limit.toLocaleString('pt-BR')}
              {m.pct != null && <span className="ml-1 font-medium">({m.pct}%)</span>}
            </>
          )}
        </span>
      </div>
      <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
        <div
          className={`h-full rounded-full transition-all ${barColor(m.pct)}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

export function BillingDashboard(props: BillingDashboardProps) {
  const {
    currentTier,
    currentPlanName,
    currentCycle,
    status,
    paymentMethod,
    cardLast4,
    cardBrand,
    priceCents,
    nextChargeISO,
    guaranteeUntilISO,
    plans,
    appointments,
    conversations,
    addonActive,
    addonName,
    addonDeactivateScheduled,
    addonPending,
    addonOffer,
    pendingChange,
  } = props;

  const router = useRouter();

  // O ciclo atual pode ser anual 12x; o seletor de troca só oferece mensal/anual à vista.
  const normalizedCurrentCycle: Cycle = currentCycle === 'MONTHLY' ? 'MONTHLY' : 'ANNUAL';
  const [tier, setTier] = useState<PlanTier>(currentTier);
  const [cycle, setCycle] = useState<Cycle>(normalizedCurrentCycle);

  const [changeState, changePlanAction, changing] = useActionState<
    ManageResult | undefined,
    FormData
  >(changePlan, undefined);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  const nextCharge = fmtDate(nextChargeISO);
  const withinGuarantee =
    guaranteeUntilISO != null && new Date(guaranteeUntilISO).getTime() > Date.now();
  // Cancelada mas ainda com acesso até o fim do período pago: a pill vira âmbar
  // "Cancelada · ativa até X" e a linha de cobrança avisa "sem novas cobranças".
  const canceledWithAccess =
    status === 'CANCELED' && nextChargeISO != null && new Date(nextChargeISO).getTime() > Date.now();
  const isActive = status === 'ACTIVE';
  const statusPill = canceledWithAccess
    ? {
        label: nextCharge ? `Cancelada · ativa até ${nextCharge}` : 'Cancelada',
        className: 'bg-amber-100 text-amber-900 ring-amber-300',
      }
    : STATUS_PILL[status];

  const currentMonthly = plans.find((p) => p.tier === currentTier)?.priceMonthlyCents ?? 0;
  const selected = plans.find((p) => p.tier === tier);
  const selectedPrice = selected
    ? cycle === 'ANNUAL'
      ? selected.priceAnnualCents
      : selected.priceMonthlyCents
    : 0;
  // Direção pela mensalidade-alvo (mesmo critério do server). Mesmo tier/ciclo = sem troca.
  const isDowngrade = selected != null && selected.priceMonthlyCents < currentMonthly;
  const isSame = tier === currentTier && cycle === normalizedCurrentCycle;

  // Próximo tier acima (p/ o atalho "falta pouco pra upgrade").
  const nextUpgrade = useMemo(
    () =>
      plans
        .filter((p) => p.priceMonthlyCents > currentMonthly)
        .sort((a, b) => a.priceMonthlyCents - b.priceMonthlyCents)[0] ?? null,
    [plans, currentMonthly],
  );

  const changeOk = changeState != null && 'ok' in changeState;
  const changeError = changeState != null && 'error' in changeState ? changeState.error : null;

  // Fecha o modal e recarrega quando a troca conclui.
  useEffect(() => {
    if (changeOk) {
      setConfirmOpen(false);
      router.refresh();
    }
  }, [changeOk, router]);

  function openChange(nextTier: PlanTier, nextCycle: Cycle) {
    setTier(nextTier);
    setCycle(nextCycle);
    setConfirmOpen(true);
  }

  function confirmChange() {
    const fd = new FormData();
    fd.set('tier', tier);
    fd.set('cycle', cycle);
    changePlanAction(fd);
  }

  const appointmentsAlerting = appointments.pct != null && appointments.pct >= 85;

  return (
    <div className="space-y-6">
      {/* 1. Plano atual */}
      <section className="bg-card rounded-2xl border p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-xl font-semibold tracking-tight">
                Plano {currentPlanName}
              </h2>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${statusPill.className}`}
              >
                {statusPill.label}
              </span>
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              Cobrança {CYCLE_LABEL[currentCycle].toLowerCase()}
            </p>
          </div>
          <div className="text-right">
            <p className="font-serif text-2xl font-semibold tabular-nums">
              {formatBRL(priceCents)}
            </p>
            <p className="text-muted-foreground text-xs">
              {currentCycle === 'MONTHLY'
                ? 'por mês'
                : currentCycle === 'ANNUAL'
                  ? 'por ano'
                  : 'por mês (12x)'}
            </p>
          </div>
        </div>

        <div className="mt-4 border-t pt-4 text-sm">
          {status === 'CANCELED' ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-muted-foreground">
                <span className="text-foreground font-medium">Sem novas cobranças.</span>{' '}
                {nextCharge ? `Tudo funciona até ${nextCharge}.` : 'O acesso foi encerrado.'}
              </p>
              {canceledWithAccess && <ReactivateButton onDone={() => router.refresh()} />}
            </div>
          ) : nextCharge ? (
            <p className="text-muted-foreground">
              Próxima cobrança em <span className="text-foreground font-medium">{nextCharge}</span>{' '}
              ·{' '}
              <span className="text-foreground font-medium tabular-nums">
                {formatBRL(priceCents)}
              </span>
            </p>
          ) : (
            <p className="text-muted-foreground">Sem próxima cobrança agendada.</p>
          )}
          {pendingChange && (
            <p className="mt-2 flex items-center gap-1.5 text-amber-700">
              <ArrowUpRight className="size-3.5" aria-hidden />A partir do próximo ciclo seu plano
              muda para{' '}
              <span className="font-medium">
                {pendingChange.planName} ({pendingChange.cycleLabel})
              </span>
              .
            </p>
          )}
        </div>
      </section>

      {/* 5. Trocas comuns em destaque (só faz sentido com assinatura ativa) */}
      {isActive && ((appointmentsAlerting && nextUpgrade) || normalizedCurrentCycle === 'MONTHLY') ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {appointmentsAlerting && nextUpgrade && (
            <button
              type="button"
              onClick={() => openChange(nextUpgrade.tier, cycle)}
              className="border-coral/30 bg-coral/5 hover:bg-coral/10 flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors"
            >
              <TrendingUp className="text-coral mt-0.5 size-5 shrink-0" aria-hidden />
              <div>
                <p className="text-sm font-semibold">Falta pouco pra um upgrade</p>
                <p className="text-muted-foreground mt-0.5 text-sm">
                  Você já usou {appointments.pct}% dos agendamentos. Passe para o {nextUpgrade.name}{' '}
                  e ganhe mais folga.
                </p>
              </div>
            </button>
          )}
          {normalizedCurrentCycle === 'MONTHLY' && (
            <button
              type="button"
              onClick={() => openChange(currentTier, 'ANNUAL')}
              className="border-green-bright/40 bg-green-bright/10 hover:bg-green-bright/15 flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors"
            >
              <Sparkles className="text-green-deep mt-0.5 size-5 shrink-0" aria-hidden />
              <div>
                <p className="text-sm font-semibold">Economize com o plano anual</p>
                <p className="text-muted-foreground mt-0.5 text-sm">
                  No anual você paga 10 meses e leva 12 - 2 meses grátis no mesmo plano.
                </p>
              </div>
            </button>
          )}
        </div>
      ) : null}

      {/* 2. Uso vs teto */}
      <section className="bg-card space-y-4 rounded-2xl border p-6">
        <h2 className="font-medium">Uso deste mês</h2>
        <UsageBar label="Agendamentos" m={appointments} />
        {conversations && <UsageBar label="Conversas do bot" m={conversations} />}
        <p className="text-muted-foreground text-xs">
          O serviço continua funcionando mesmo se passar do teto - o limite serve para você saber a
          hora de subir de plano.
        </p>
      </section>

      {isActive && (
        <>
      {/* 3a. Trocar de plano */}
      <section className="bg-card space-y-4 rounded-2xl border p-6">
        <div>
          <h2 className="font-medium">Trocar de plano</h2>
          <p className="text-muted-foreground text-sm">
            Upgrade vale na hora. Downgrade respeita o período já pago e passa a valer no próximo
            ciclo.
          </p>
        </div>

        <div className="flex gap-2">
          {(['MONTHLY', 'ANNUAL'] as Cycle[]).map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setCycle(c)}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                cycle === c ? 'bg-foreground text-background border-foreground' : 'bg-background'
              }`}
            >
              {c === 'MONTHLY' ? 'Mensal' : 'Anual (2 meses grátis)'}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {plans.map((p) => {
            const price = cycle === 'ANNUAL' ? p.priceAnnualCents : p.priceMonthlyCents;
            const isCurrentPlan = p.tier === currentTier;
            return (
              <label
                key={p.tier}
                className={`flex cursor-pointer items-center justify-between rounded-xl border p-3.5 transition-colors ${
                  tier === p.tier
                    ? 'border-foreground ring-foreground ring-1'
                    : 'hover:border-foreground/40'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="planRadio"
                    checked={tier === p.tier}
                    onChange={() => setTier(p.tier)}
                    className="accent-coral"
                  />
                  <span className="font-medium">{p.name}</span>
                  {isCurrentPlan && <span className="text-muted-foreground text-xs">(atual)</span>}
                </span>
                <span className="text-sm tabular-nums">
                  {formatBRL(price)}
                  <span className="text-muted-foreground">
                    /{cycle === 'ANNUAL' ? 'ano' : 'mês'}
                  </span>
                </span>
              </label>
            );
          })}
        </div>

        {changeError && <p className="text-sm text-red-600">{changeError}</p>}

        <Button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={isSame}
          variant={isDowngrade ? 'outline' : 'default'}
        >
          {isSame ? 'Plano atual' : isDowngrade ? 'Agendar downgrade' : 'Revisar troca'}
        </Button>
      </section>

      {/* 3b. Addon Atendente IA */}
      <section className="bg-card space-y-4 rounded-2xl border p-6">
        <div className="flex items-center gap-2">
          <Sparkles className="text-coral size-4" aria-hidden />
          <h2 className="font-medium">Atendente IA no WhatsApp</h2>
        </div>

        {addonActive ? (
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Ativo{addonName ? ` · ${addonName}` : ''}. O uso de conversas aparece no bloco de uso
              acima.
            </p>
            {addonDeactivateScheduled ? (
              <p className="rounded-lg bg-amber-50 p-3 text-amber-900">
                Desativação agendada - o bot atende até o fim do ciclo pago
                {nextCharge ? ` (${nextCharge})` : ''} e não é renovado.
              </p>
            ) : (
              <DeactivateAddonButton onDone={() => router.refresh()} />
            )}
          </div>
        ) : addonPending === 'verification' ? (
          <div className="space-y-3 text-sm">
            <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-amber-900">
              <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
              Setup pago! Estamos configurando sua conta oficial no WhatsApp. Assim que estiver no
              ar, avisamos você - e só então a mensalidade começa.
            </p>
            <Button asChild variant="outline">
              <Link href="/assinatura/atendente-ia">Ver status e conectar WhatsApp</Link>
            </Button>
          </div>
        ) : addonPending === 'setup_payment' ? (
          <div className="space-y-3 text-sm">
            <p className="rounded-lg bg-amber-50 p-3 text-amber-900">
              Falta pagar o setup para começarmos a configuração do seu número.
            </p>
            <Button asChild variant="coral">
              <Link href="/assinatura/atendente-ia">Continuar ativação</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Um atendente de IA que conversa, tira dúvidas e agenda pelo WhatsApp. Soma em cima do
              seu plano, com teto próprio de conversas.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {addonOffer.map((a) => (
                <div key={a.name} className="rounded-xl border p-4">
                  <p className="text-sm font-semibold">{a.name}</p>
                  <p className="mt-1 font-serif text-lg font-semibold tabular-nums">
                    +{formatBRL(a.priceMonthlyCents)}
                    <span className="text-muted-foreground text-xs font-normal">/mês</span>
                  </p>
                  <p className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
                    <Check
                      className="text-green-bright size-3.5 shrink-0"
                      strokeWidth={3}
                      aria-hidden
                    />
                    {a.conversationsPerMonth
                      ? `Até ${a.conversationsPerMonth.toLocaleString('pt-BR')} conversas/mês`
                      : 'Conversas ilimitadas'}
                  </p>
                </div>
              ))}
            </div>
            <ActivateAddonCta setupFeeCents={addonOffer[0]?.setupFeeCents ?? null} />
          </div>
        )}
      </section>
        </>
      )}

      {/* 3c. Pagamento + faturas + cancelamento */}
      <section className="bg-card space-y-3 rounded-2xl border p-6">
        <h2 className="font-medium">Pagamento</h2>

        {/* Linha da forma de pagamento: badge + descrição + "Trocar" (só com assinatura ativa). */}
        <div className="border-border-soft bg-cream flex flex-wrap items-center gap-3 rounded-xl border p-3.5">
          <span
            className="bg-green-deep text-on-emerald flex h-6 w-9 shrink-0 items-center justify-center rounded-md text-[8px] font-bold tracking-wider"
            aria-hidden
          >
            {paymentMethod === 'PIX' ? 'PIX' : 'CARD'}
          </span>
          <p className="text-ink-70 min-w-0 flex-1 text-[13px] font-medium">
            {paymentMethod === 'PIX'
              ? 'Pix recorrente - o Pix é gerado a cada renovação.'
              : cardLast4
                ? `Cartão de crédito •••• ${cardLast4}${cardBrand ? ` · ${cardBrand}` : ''}`
                : paymentMethod === 'CREDIT_CARD'
                  ? 'Cartão de crédito cadastrado.'
                  : 'Forma de pagamento definida no checkout.'}
          </p>
          {isActive && (
            <button
              type="button"
              onClick={() => setPayOpen(true)}
              className="text-green-deep hover:bg-chip shrink-0 rounded-lg px-2.5 py-2 text-xs font-semibold whitespace-nowrap"
            >
              Trocar
            </button>
          )}
        </div>

        <a
          className="text-sm underline underline-offset-2"
          href="#faturas"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById('faturas')?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          Ver faturas anteriores
        </a>

        {/* Cancelar sempre visível qdo ativa - dificultar cancelamento queima confiança. */}
        {isActive && (
          <div className="border-t pt-3">
            <Button
              type="button"
              variant="ghost"
              className="text-red-600 hover:text-red-700"
              onClick={() => setCancelOpen(true)}
            >
              Cancelar assinatura
            </Button>
          </div>
        )}
      </section>

      {/* Modal: confirmar troca de plano */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent dismissable={false}>
          <DialogHeader>
            <DialogTitle>
              {isDowngrade ? 'Agendar troca de plano' : 'Confirmar troca de plano'}
            </DialogTitle>
            <DialogDescription>
              {selected?.name} · {cycle === 'ANNUAL' ? 'anual' : 'mensal'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <div className="bg-muted/40 flex items-center justify-between rounded-lg p-3">
              <span className="text-muted-foreground">Novo valor</span>
              <span className="font-semibold tabular-nums">
                {formatBRL(selectedPrice)}
                <span className="text-muted-foreground font-normal">
                  /{cycle === 'ANNUAL' ? 'ano' : 'mês'}
                </span>
              </span>
            </div>
            {isSame ? (
              <p className="text-muted-foreground">Este já é o seu plano atual.</p>
            ) : isDowngrade ? (
              <p className="text-muted-foreground">
                Você mantém os limites e recursos atuais até o fim do período já pago
                {nextCharge ? ` (${nextCharge})` : ''}. O {selected?.name} passa a valer no próximo
                ciclo - nada é cobrado agora.
              </p>
            ) : (
              <p className="text-muted-foreground">
                Os novos limites e recursos liberam na hora. O novo valor é cobrado no próximo ciclo
                {nextCharge ? ` (${nextCharge})` : ''}, sem cobrança proporcional agora.
              </p>
            )}
            {changeError && <p className="text-red-600">{changeError}</p>}
          </div>

          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={changing}>
                Voltar
              </Button>
            </DialogClose>
            <Button type="button" onClick={confirmChange} disabled={changing || isSame}>
              {changing ? 'Aplicando…' : isDowngrade ? 'Agendar downgrade' : 'Confirmar upgrade'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: trocar forma de pagamento */}
      <PaymentMethodDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        currentMethod={paymentMethod}
        priceLabel={formatBRL(priceCents)}
        nextCharge={nextCharge}
        onChanged={() => router.refresh()}
      />

      {/* Modal: cancelamento com retenção + reativar */}
      <CancelDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        withinGuarantee={withinGuarantee}
        nextCharge={nextCharge}
        onChanged={() => router.refresh()}
      />
    </div>
  );
}

// --- Botões/ações isolados (cada um com seu próprio estado de transição) -------

/** Reativa a assinatura cancelada num toque (recria a recorrência no Asaas). */
function ReactivateButton({
  onDone,
  variant = 'coral',
}: {
  onDone: () => void;
  variant?: 'coral' | 'outline';
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant={variant}
        disabled={pending}
        onClick={() => {
          setError(null);
          start(async () => {
            const r = await reactivateSubscription();
            if ('error' in r) setError(r.error);
            else onDone();
          });
        }}
      >
        {pending ? 'Reativando…' : 'Reativar assinatura'}
      </Button>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}

function DeactivateAddonButton({ onDone }: { onDone: () => void }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="ghost" className="text-red-600" onClick={() => setOpen(true)}>
        Desativar Atendente IA
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dismissable={false}>
          <DialogHeader>
            <DialogTitle>Desativar o Atendente IA?</DialogTitle>
            <DialogDescription>
              O bot continua atendendo até o fim do ciclo já pago e não é renovado depois. Você pode
              reativar quando quiser.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={pending}>
                Voltar
              </Button>
            </DialogClose>
            <Button
              type="button"
              disabled={pending}
              onClick={() => {
                setError(null);
                start(async () => {
                  const r = await deactivateAddon();
                  if ('error' in r) setError(r.error);
                  else {
                    setOpen(false);
                    onDone();
                  }
                });
              }}
            >
              {pending ? 'Desativando…' : 'Desativar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * CTA de ativação do addon: leva ao wizard dedicado (/assinatura/atendente-ia), onde o
 * tenant escolhe o canal (número Demandaê vs próprio), a identidade do bot e paga.
 */
function ActivateAddonCta({ setupFeeCents }: { setupFeeCents: number | null }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button asChild variant="coral">
        <Link href="/assinatura/atendente-ia">Ativar Atendente IA</Link>
      </Button>
      {setupFeeCents != null && (
        <span className="text-muted-foreground text-xs">
          No número do Demandaê: ativa na hora, sem setup. No seu próprio número: + setup único de{' '}
          {formatBRL(setupFeeCents)}.
        </span>
      )}
    </div>
  );
}

/** Motivos de cancelamento (radio obrigatório). O texto vai como feedback ao servidor. */
const CANCEL_REASONS = [
  'Tá pesando no bolso agora',
  'Não usei tanto quanto esperava',
  'Faltou um recurso que eu precisava',
  'Foi só pra testar',
  'Vou usar outra ferramenta',
];

/**
 * Cancelamento com retenção: "Já vai embora?" + 5 motivos (radio obrigatório - o botão de
 * cancelar fica cinza até escolher). Confirmando, vira a tela "Assinatura cancelada" com
 * Reativar num toque. "Vou ficar" é o CTA coral que fecha sem cancelar.
 */
function CancelDialog({
  open,
  onOpenChange,
  withinGuarantee,
  nextCharge,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  withinGuarantee: boolean;
  nextCharge: string | null;
  onChanged: () => void;
}) {
  const [reason, setReason] = useState('');
  const [step, setStep] = useState<'ask' | 'done'>('ask');
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function close() {
    onOpenChange(false);
    // Reseta depois da animação de fechar, pra não piscar de volta pro passo 'ask'.
    setTimeout(() => {
      setStep('ask');
      setReason('');
      setError(null);
    }, 200);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : close())}>
      <DialogContent dismissable={false}>
        {step === 'ask' ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-serif text-[22px] font-medium tracking-tight">
                Já vai <em className="italic text-green-deep">embora</em>?
              </DialogTitle>
              <DialogDescription>
                Antes de cancelar, conta pra gente o que pesou - de verdade, isso ajuda.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-2">
              {CANCEL_REASONS.map((r) => {
                const on = reason === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(r)}
                    className={`flex items-center gap-2.5 rounded-xl border p-3 text-left text-[13px] font-semibold transition-colors ${
                      on ? 'border-green-bright bg-chip' : 'border-border hover:border-green-bright/50'
                    }`}
                  >
                    <span
                      className={`flex size-4 shrink-0 items-center justify-center rounded-full border-2 ${
                        on ? 'border-green-bright' : 'border-border'
                      }`}
                    >
                      {on && <span className="bg-green-bright size-2 rounded-full" />}
                    </span>
                    {r}
                  </button>
                );
              })}
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-[12.5px] leading-relaxed text-amber-900">
              {withinGuarantee ? (
                <>
                  Você está nos <strong>30 dias de garantia</strong>: ao cancelar, fazemos o reembolso
                  integral automático e o acesso encerra agora. Seus dados ficam guardados por 90 dias.
                </>
              ) : (
                <>
                  Cancelando, sua página sai do ar e o app para de mostrar seus horários em{' '}
                  <strong>{nextCharge ?? 'o fim do período'}</strong>. Seus dados e clientes ficam
                  guardados por 90 dias - se voltar, tá tudo lá.
                </>
              )}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex items-center gap-3 border-t pt-3">
              <button
                type="button"
                disabled={!reason || pending}
                onClick={() => {
                  setError(null);
                  start(async () => {
                    const r = await cancelSubscription(reason);
                    if ('error' in r) setError(r.error);
                    else {
                      setStep('done');
                      onChanged();
                    }
                  });
                }}
                className={`rounded-full px-3.5 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                  reason
                    ? 'text-coral-deep hover:bg-coral-tint'
                    : 'text-ink-30 cursor-not-allowed'
                }`}
              >
                {!reason
                  ? 'Escolhe um motivo pra continuar'
                  : pending
                    ? 'Cancelando…'
                    : 'Cancelar assinatura'}
              </button>
              <div className="flex-1" />
              <DialogClose asChild>
                <Button type="button" variant="coral" disabled={pending}>
                  Vou ficar
                </Button>
              </DialogClose>
            </div>
          </>
        ) : (
          <div className="px-1 py-2 text-center">
            <div className="border-border mx-auto mb-4 flex size-16 items-center justify-center rounded-full border bg-[#f6f1e4] text-ink-50">
              <BellOff className="size-6" aria-hidden />
            </div>
            <DialogTitle className="font-serif text-2xl font-medium tracking-tight">
              Assinatura <em className="italic text-ink-50">cancelada</em>
            </DialogTitle>
            <p className="text-ink-70 mx-auto mt-2.5 max-w-sm text-[13px] leading-relaxed">
              {withinGuarantee
                ? 'Reembolso integral a caminho. Seus dados ficam guardados por 90 dias.'
                : `Tudo continua funcionando até ${nextCharge ?? 'o fim do período'}. Depois disso, seus dados ficam guardados por 90 dias.`}
            </p>
            <p className="text-ink-50 mt-1 text-xs">Mudou de ideia? É um toque pra reativar.</p>
            <div className="mt-5 flex items-center justify-center gap-3">
              {!withinGuarantee && <ReactivateButton onDone={close} />}
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  Fechar
                </Button>
              </DialogClose>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Estilo compartilhado dos inputs do form de cartão (paleta cream/verde do protótipo).
const CARD_INPUT_CLASS =
  'border-border bg-cream text-ink w-full rounded-xl border px-3.5 py-3 text-sm outline-none focus:border-green-bright';

/**
 * Trocar forma de pagamento: abas Cartão / Pix recorrente.
 * - Cartão: máscaras + CTA que só acende com dados completos. O cartão é tokenizado no Asaas
 *   (o PAN/CVV não fica no nosso servidor); a linha de cobrança passa a mostrar os últimos 4.
 * - Pix: troca a recorrência pra Pix e mostra o QR/copia-e-cola da cobrança em aberto.
 */
function PaymentMethodDialog({
  open,
  onOpenChange,
  currentMethod,
  priceLabel,
  nextCharge,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currentMethod: PaymentMethod | null;
  priceLabel: string;
  nextCharge: string | null;
  onChanged: () => void;
}) {
  const [tab, setTab] = useState<'card' | 'pix'>(currentMethod === 'PIX' ? 'pix' : 'card');
  const [card, setCard] = useState({
    number: '',
    exp: '',
    cvv: '',
    name: '',
    cpfCnpj: '',
    cep: '',
    addressNumber: '',
  });
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pix, setPix] = useState<{ qrCode: string; copyPaste: string } | null>(null);
  const [pixDone, setPixDone] = useState(false);
  const [copied, setCopied] = useState(false);

  const cardOk = isCardComplete(card);
  const set = (k: keyof typeof card, v: string) => setCard((c) => ({ ...c, [k]: v }));

  function close() {
    onOpenChange(false);
    setTimeout(() => {
      setError(null);
      setPix(null);
      setPixDone(false);
      setCopied(false);
    }, 200);
  }

  function submitCard() {
    setError(null);
    start(async () => {
      const r = await changePaymentMethod({
        method: 'CARD',
        cardNumber: card.number,
        cardExp: card.exp,
        cardCvv: card.cvv,
        cardName: card.name,
        cpfCnpj: card.cpfCnpj,
        cep: card.cep,
        addressNumber: card.addressNumber,
      });
      if ('error' in r) setError(r.error);
      else {
        onChanged();
        close();
      }
    });
  }

  function submitPix() {
    setError(null);
    start(async () => {
      const r = await changePaymentMethod({ method: 'PIX' });
      if ('error' in r) setError(r.error);
      else if (r.method === 'PIX') {
        onChanged();
        // Tem cobrança em aberto → mostra o QR pra pagar; senão só confirma (vale da próxima).
        if (r.pix) setPix(r.pix);
        else setPixDone(true);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : close())}>
      <DialogContent dismissable={false}>
        <DialogHeader>
          <DialogTitle className="font-serif text-[22px] font-medium tracking-tight">
            Forma de <em className="italic text-green-deep">pagamento</em>
          </DialogTitle>
          <DialogDescription>
            Vale a partir da próxima cobrança{nextCharge ? `, ${nextCharge}` : ''}.
          </DialogDescription>
        </DialogHeader>

        {pix ? (
          // Pix ativado com cobrança em aberto: QR + copia-e-cola pra pagar agora.
          <div className="flex flex-col gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pix.qrCode} alt="QR Code Pix" className="mx-auto size-52 rounded-xl" />
            <div className="flex items-center gap-2">
              <p className="border-border bg-cream text-ink-70 min-w-0 flex-1 truncate rounded-xl border px-3.5 py-3 font-mono text-xs">
                {pix.copyPaste}
              </p>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(pix.copyPaste);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1800);
                  } catch {
                    /* clipboard indisponível - o usuário copia manualmente */
                  }
                }}
                className="border-border text-ink-70 hover:bg-cream-2 shrink-0 rounded-xl border px-3.5 py-3 text-xs font-semibold whitespace-nowrap"
              >
                {copied ? 'Copiado!' : 'Copiar código'}
              </button>
            </div>
            <div className="flex justify-end">
              <Button type="button" variant="coral" onClick={close}>
                Já paguei
              </Button>
            </div>
          </div>
        ) : pixDone ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="bg-chip flex size-14 items-center justify-center rounded-full">
              <Check className="text-green-deep size-6" strokeWidth={2.4} aria-hidden />
            </div>
            <p className="text-ink-70 max-w-sm text-sm leading-relaxed">
              Pix ativado. O próximo Pix de <strong className="text-ink">{priceLabel}</strong> é gerado
              na renovação{nextCharge ? `, ${nextCharge}` : ''}.
            </p>
            <Button type="button" variant="coral" onClick={close}>
              Fechar
            </Button>
          </div>
        ) : (
          <>
            {/* Abas */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTab('card')}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-3 text-[12.5px] font-semibold transition-colors ${
                  tab === 'card'
                    ? 'border-green-bright bg-chip text-green-deep'
                    : 'border-border text-ink-70'
                }`}
              >
                <CreditCard className="size-4" aria-hidden />
                Cartão de crédito
              </button>
              <button
                type="button"
                onClick={() => setTab('pix')}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-3 text-[12.5px] font-semibold transition-colors ${
                  tab === 'pix'
                    ? 'border-green-bright bg-chip text-green-deep'
                    : 'border-border text-ink-70'
                }`}
              >
                <QrCode className="size-4" aria-hidden />
                Pix recorrente
              </button>
            </div>

            {tab === 'card' ? (
              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-ink-70 text-xs font-semibold">Número do cartão</span>
                  <input
                    value={card.number}
                    onChange={(e) => set('number', maskCardNumber(e.target.value))}
                    placeholder="0000 0000 0000 0000"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    className={CARD_INPUT_CLASS}
                  />
                </label>
                <div className="flex gap-2.5">
                  <label className="flex flex-1 flex-col gap-1.5">
                    <span className="text-ink-70 text-xs font-semibold">Validade</span>
                    <input
                      value={card.exp}
                      onChange={(e) => set('exp', maskExpiry(e.target.value))}
                      placeholder="MM/AA"
                      inputMode="numeric"
                      autoComplete="cc-exp"
                      className={CARD_INPUT_CLASS}
                    />
                  </label>
                  <label className="flex flex-1 flex-col gap-1.5">
                    <span className="text-ink-70 text-xs font-semibold">CVV</span>
                    <input
                      value={card.cvv}
                      onChange={(e) => set('cvv', maskCvv(e.target.value))}
                      placeholder="123"
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      className={CARD_INPUT_CLASS}
                    />
                  </label>
                </div>
                <label className="flex flex-col gap-1.5">
                  <span className="text-ink-70 text-xs font-semibold">Nome impresso no cartão</span>
                  <input
                    value={card.name}
                    onChange={(e) => set('name', e.target.value)}
                    placeholder="Como aparece no cartão"
                    autoComplete="cc-name"
                    className={CARD_INPUT_CLASS}
                  />
                </label>
                <div className="flex gap-2.5">
                  <label className="flex flex-[1.4] flex-col gap-1.5">
                    <span className="text-ink-70 text-xs font-semibold">CPF/CNPJ do titular</span>
                    <input
                      value={card.cpfCnpj}
                      onChange={(e) => set('cpfCnpj', e.target.value)}
                      placeholder="Somente números"
                      inputMode="numeric"
                      className={CARD_INPUT_CLASS}
                    />
                  </label>
                  <label className="flex flex-1 flex-col gap-1.5">
                    <span className="text-ink-70 text-xs font-semibold">CEP</span>
                    <input
                      value={card.cep}
                      onChange={(e) => set('cep', maskCep(e.target.value))}
                      placeholder="00000-000"
                      inputMode="numeric"
                      className={CARD_INPUT_CLASS}
                    />
                  </label>
                  <label className="flex w-20 flex-col gap-1.5">
                    <span className="text-ink-70 text-xs font-semibold">Nº</span>
                    <input
                      value={card.addressNumber}
                      onChange={(e) => set('addressNumber', e.target.value)}
                      placeholder="50"
                      inputMode="numeric"
                      className={CARD_INPUT_CLASS}
                    />
                  </label>
                </div>
                <p className="text-ink-50 text-[11.5px] leading-relaxed">
                  O cartão é processado com segurança pelo Asaas - guardamos só os últimos 4 dígitos
                  {card.number.replace(/\D/g, '').length >= 4 ? ` (•••• ${extractLast4(card.number)})` : ''}.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="border-border-soft bg-cream flex items-center gap-3.5 rounded-2xl border p-3.5">
                  <div className="border-border text-ink-30 flex size-[68px] shrink-0 items-center justify-center rounded-xl border border-dashed bg-white">
                    <QrCode className="size-7" aria-hidden />
                  </div>
                  <p className="text-ink-70 min-w-0 flex-1 text-[12.5px] leading-relaxed">
                    Ao ativar, a recorrência passa a ser por <strong className="text-ink">Pix</strong>:
                    a cada renovação geramos um Pix de <strong className="text-ink">{priceLabel}</strong>{' '}
                    pra você pagar. Sem cartão, sem boleto.
                  </p>
                </div>
                <p className="text-ink-50 text-[11.5px] leading-relaxed">
                  Volta pro cartão quando quiser, aqui mesmo.
                </p>
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex items-center justify-end gap-2 border-t pt-3">
              <DialogClose asChild>
                <Button type="button" variant="ghost" disabled={pending}>
                  Cancelar
                </Button>
              </DialogClose>
              {tab === 'card' ? (
                <Button type="button" variant="coral" disabled={!cardOk || pending} onClick={submitCard}>
                  {pending ? 'Salvando…' : 'Salvar cartão'}
                </Button>
              ) : (
                <Button type="button" variant="coral" disabled={pending} onClick={submitPix}>
                  {pending ? 'Ativando…' : 'Ativar Pix recorrente'}
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
