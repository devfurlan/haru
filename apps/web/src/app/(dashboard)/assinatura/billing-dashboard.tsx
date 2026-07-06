'use client';

import type { BillingCycle, PlanTier, SubscriptionStatus } from '@haru/database';
import { formatBRL } from '@haru/shared';
import { AlertTriangle, ArrowUpRight, Check, Clock, Sparkles, TrendingUp } from 'lucide-react';
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
  cancelSubscription,
  changePlan,
  deactivateAddon,
  updateCard,
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

  const nextCharge = fmtDate(nextChargeISO);
  const withinGuarantee =
    guaranteeUntilISO != null && new Date(guaranteeUntilISO).getTime() > Date.now();
  const statusPill = STATUS_PILL[status];

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
            <p className="text-muted-foreground">
              Assinatura cancelada.{' '}
              {nextCharge ? `Seu acesso vai até ${nextCharge}.` : 'O acesso foi encerrado.'}
            </p>
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

      {/* 5. Trocas comuns em destaque */}
      {(appointmentsAlerting && nextUpgrade) || normalizedCurrentCycle === 'MONTHLY' ? (
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

      {/* 3c. Pagamento + faturas + cancelamento */}
      <section className="bg-card space-y-3 rounded-2xl border p-6">
        <h2 className="font-medium">Pagamento</h2>
        <div className="flex flex-wrap items-center gap-2">
          <UpdateCardButton />
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
        </div>
        {/* Cancelar sempre visível - dificultar cancelamento queima confiança. */}
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

      {/* Modal: cancelamento */}
      <CancelDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        withinGuarantee={withinGuarantee}
        nextCharge={nextCharge}
        onCanceled={() => router.refresh()}
      />
    </div>
  );
}

// --- Botões/ações isolados (cada um com seu próprio estado de transição) -------

function UpdateCardButton() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() => {
          setError(null);
          start(async () => {
            const r = await updateCard();
            if ('error' in r) setError(r.error);
            else window.location.href = r.redirectUrl;
          });
        }}
      >
        {pending ? 'Abrindo…' : 'Trocar cartão'}
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

function CancelDialog({
  open,
  onOpenChange,
  withinGuarantee,
  nextCharge,
  onCanceled,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  withinGuarantee: boolean;
  nextCharge: string | null;
  onCanceled: () => void;
}) {
  const [reason, setReason] = useState('');
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dismissable={false}>
        <DialogHeader>
          <DialogTitle>Cancelar sua assinatura?</DialogTitle>
          <DialogDescription>
            {withinGuarantee
              ? 'Você está dentro dos 30 dias de garantia: ao cancelar, fazemos o reembolso integral automático e o acesso é encerrado agora.'
              : `Sem novas cobranças. Você continua com acesso até o fim do período já pago${
                  nextCharge ? ` (${nextCharge})` : ''
                }.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label htmlFor="cancelReason" className="text-sm font-medium">
            Quer contar por que está saindo?{' '}
            <span className="text-muted-foreground">(opcional)</span>
          </label>
          <textarea
            id="cancelReason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Seu feedback nos ajuda a melhorar."
            className="border-input bg-background focus-visible:ring-ring w-full rounded-md border p-2 text-sm focus-visible:outline-none focus-visible:ring-2"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <DialogClose asChild>
            <Button type="button" variant="ghost" disabled={pending}>
              Manter assinatura
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={() => {
              setError(null);
              start(async () => {
                const r = await cancelSubscription(reason);
                if ('error' in r) setError(r.error);
                else {
                  onOpenChange(false);
                  onCanceled();
                }
              });
            }}
          >
            {pending ? 'Cancelando…' : 'Confirmar cancelamento'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
