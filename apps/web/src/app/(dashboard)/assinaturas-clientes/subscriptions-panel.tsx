'use client';

import { useState, useTransition } from 'react';
import { ArrowUp, History, Pencil, Repeat, TrendingUp, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SegmentedControl } from '@/components/ui/segmented-control';
import {
  cancelMembershipAsOwner,
  fetchMembershipHistory,
  setMembershipPlanActive,
} from '@/lib/memberships/plans';
import type {
  MembershipHistory,
  PlanGroup,
  PlanRow,
  SubscriberRow,
  SubscriptionsOverview,
} from '@/lib/subscriptions-panel';

import { PlanForm, type PlanFormServiceOption } from './plan-form';

interface SubscriptionsPanelProps {
  overview: SubscriptionsOverview;
  services: PlanFormServiceOption[];
  providerLabel: string | null;
  paymentConnected: boolean;
}

const brl0 = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });

type Tab = 'planos' | 'assinantes' | 'receita';
const TABS: { label: string; value: Tab }[] = [
  { label: 'Planos', value: 'planos' },
  { label: 'Assinantes', value: 'assinantes' },
  { label: 'Receita', value: 'receita' },
];

export function SubscriptionsPanel({
  overview,
  services,
  providerLabel,
  paymentConnected,
}: SubscriptionsPanelProps) {
  const [tab, setTab] = useState<Tab>('planos');
  const [formPlan, setFormPlan] = useState<PlanRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState<SubscriberRow | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<MembershipHistory | null>(null);
  const [pending, startTransition] = useTransition();

  const hasPlans = overview.plans.length > 0;
  const hasSubscribers = overview.groups.length > 0;

  const openNew = () => {
    setFormPlan(null);
    setFormOpen(true);
  };
  const openEdit = (p: PlanRow) => {
    setFormPlan(p);
    setFormOpen(true);
  };

  const togglePause = (p: PlanRow) =>
    startTransition(() => setMembershipPlanActive(p.id, !p.active).then(() => {}));

  const doCancel = () => {
    if (!confirmCancel) return;
    startTransition(async () => {
      await cancelMembershipAsOwner(confirmCancel.membershipId);
      setConfirmCancel(null);
    });
  };

  const openHistory = (row: SubscriberRow) => {
    setHistory(null);
    setHistoryOpen(true);
    startTransition(async () => {
      const h = await fetchMembershipHistory(row.membershipId);
      setHistory(h);
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4">
      {/* cabeçalho */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-[260px] flex-1">
          <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#1b7a4b]">
            <span className="mr-1.5 inline-block size-1.5 rounded-full bg-[var(--brand-green-bright)] align-middle" />
            Receita recorrente
          </div>
          <h1 className="text-ink mt-1.5 font-serif text-[30px] tracking-tight">Assinaturas</h1>
          <p className="text-ink-70 mt-1 max-w-[600px] text-[13px] leading-relaxed">
            Planos que <strong className="text-ink font-semibold">seus clientes</strong> assinam e
            pagam todo mês pra usar seus serviços. É a sua receita que se repete sozinha -{' '}
            <span className="text-ink-50">nada a ver com o seu plano Demandaê.</span>
          </p>
        </div>
        {hasPlans && <Button onClick={openNew}>Criar plano</Button>}
      </div>

      {/* status do recebimento */}
      {paymentConnected ? (
        <div className="text-ink-50 flex flex-wrap items-center gap-2 text-[12px] font-medium">
          <span className="bg-chip inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold text-[#14513a]">
            <span className="size-1.5 rounded-full bg-[var(--brand-green-bright)]" />
            Recebendo por {providerLabel ?? 'sua conta'}
          </span>
          <span>
            A cobrança é feita pelo Demandaê usando a sua conta - o dinheiro cai direto na sua.
          </span>
        </div>
      ) : (
        <div className="border-coral/30 bg-coral-tint/50 flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3">
          <div className="min-w-[220px] flex-1">
            <div className="text-ink text-[13px] font-semibold">Conecte uma conta pra receber</div>
            <div className="text-ink-70 text-[12px]">
              Seus planos estão aqui, mas sem uma conta de pagamento ninguém consegue assinar.
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <a href="/settings">Conectar conta</a>
          </Button>
        </div>
      )}

      {!hasPlans ? (
        <EmptyState onCreate={openNew} />
      ) : (
        <>
          <div className="flex">
            <SegmentedControl
              options={TABS}
              value={tab}
              onChange={setTab}
              aria-label="Seções de assinaturas"
            />
          </div>

          {tab === 'planos' && (
            <PlanosTab
              overview={overview}
              pending={pending}
              onEdit={openEdit}
              onTogglePause={togglePause}
            />
          )}
          {tab === 'assinantes' && (
            <AssinantesTab
              groups={overview.groups}
              hasSubscribers={hasSubscribers}
              onHistory={openHistory}
              onCancel={setConfirmCancel}
            />
          )}
          {tab === 'receita' && <ReceitaTab overview={overview} />}
        </>
      )}

      {/* modal criar/editar plano */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent
          dismissable={false}
          className="max-h-[calc(100vh-40px)] max-w-[560px] overflow-y-auto"
        >
          <DialogHeader>
            <DialogTitle className="font-serif text-[22px]">
              {formPlan ? 'Editar' : 'Novo'} plano de{' '}
              <em className="text-green-emph italic">assinatura</em>
            </DialogTitle>
            <p className="text-ink-50 text-[13px]">
              Serviços, créditos por mês e preço. O cliente assina no app e a cobrança se repete
              sozinha.
            </p>
          </DialogHeader>
          <PlanForm
            plan={formPlan ?? undefined}
            services={services}
            onSuccess={() => setFormOpen(false)}
            onCancel={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* confirmar cancelamento de assinante */}
      <Dialog open={Boolean(confirmCancel)} onOpenChange={(o) => !o && setConfirmCancel(null)}>
        <DialogContent className="max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="font-serif text-[20px]">
              Cancelar a assinatura de {confirmCancel?.name}?
            </DialogTitle>
            <p className="text-ink-70 text-[13px] leading-relaxed">
              As cobranças futuras param na hora.{' '}
              {confirmCancel && confirmCancel.creditBalance > 0 ? (
                <>
                  Os{' '}
                  <strong className="text-ink font-semibold">
                    {confirmCancel.creditBalance}{' '}
                    {confirmCancel.creditBalance === 1 ? 'crédito' : 'créditos'}
                  </strong>{' '}
                  que já foram pagos continuam valendo até o fim do ciclo atual - não são perdidos.
                </>
              ) : (
                'Os créditos já pagos continuam valendo até o fim do ciclo atual.'
              )}
            </p>
          </DialogHeader>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setConfirmCancel(null)} disabled={pending}>
              Manter assinatura
            </Button>
            <Button variant="destructive" onClick={doCancel} disabled={pending}>
              {pending ? 'Cancelando…' : 'Cancelar assinatura'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* histórico de cobranças */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="font-serif text-[20px]">
              Histórico {history ? `de ${history.name}` : ''}
            </DialogTitle>
            {history && <p className="text-ink-50 text-[13px]">Plano {history.planName}</p>}
          </DialogHeader>
          {!history ? (
            <p className="text-ink-50 py-6 text-center text-[13px]">Carregando…</p>
          ) : history.rows.length === 0 ? (
            <p className="text-ink-50 py-6 text-center text-[13px]">
              Nenhuma cobrança registrada ainda.
            </p>
          ) : (
            <div className="flex flex-col">
              {history.rows.map((r, i) => (
                <div
                  key={i}
                  className="border-edge flex items-center gap-3 border-t border-dotted py-2.5 first:border-t-0"
                >
                  <span className="text-ink flex-1 text-[13px] font-medium">{r.dateLabel}</span>
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                      r.paid ? 'bg-chip text-green-emph' : 'bg-cream-2 text-ink-50'
                    }`}
                  >
                    {r.statusLabel}
                  </span>
                  <span className="text-ink min-w-[72px] text-right font-serif text-[14px]">
                    {r.amountLabel}
                  </span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Estado vazio (com plano, sem plano) ───
function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="border-edge bg-paper shadow-soft rounded-[22px] border border-dashed px-7 py-10 text-center">
      <div className="bg-chip text-green-emph mx-auto mb-3.5 flex size-[60px] items-center justify-center rounded-[17px]">
        <Repeat className="size-7" />
      </div>
      <div className="text-ink font-serif text-[26px] tracking-tight">
        Transforme cliente fiel em <em className="text-green-emph italic">receita previsível</em>
      </div>
      <p className="text-ink-70 mx-auto mt-2.5 max-w-[470px] text-[13.5px] leading-relaxed">
        Crie um plano - tipo &quot;4 cortes por mês&quot; - e seu cliente paga todo mês no cartão.
        Ele agenda usando os créditos, e você já sabe quanto entra <em className="italic">antes</em>{' '}
        do mês começar.
      </p>
      <div className="mx-auto mt-5 flex max-w-[430px] flex-col gap-2.5 text-left">
        {[
          'Você cria o plano: serviços, quantos créditos por mês e o preço.',
          'O cliente assina no app e a cobrança cai no cartão todo mês, sozinha.',
          'Ele agenda usando os créditos - o desconto é automático, sem você fazer nada.',
        ].map((tx, i) => (
          <div key={i} className="text-ink-70 flex gap-2.5 text-[13px] leading-snug">
            <span className="bg-chip text-green-emph flex size-[22px] flex-none items-center justify-center rounded-full text-[11px] font-bold">
              {i + 1}
            </span>
            {tx}
          </div>
        ))}
      </div>
      <Button variant="coral" className="mt-5" onClick={onCreate}>
        Criar meu primeiro plano
      </Button>
    </div>
  );
}

// ─── Hero de MRR (reusado em Planos e Receita) ───
function MrrHero({
  overview,
  variant,
}: {
  overview: SubscriptionsOverview;
  variant: 'planos' | 'receita';
}) {
  const { metrics, delta } = overview;
  return (
    <div className="bg-green-deep text-on-emerald relative overflow-hidden rounded-[20px] px-[26px] py-6 [background-image:radial-gradient(560px_280px_at_8%_-25%,rgba(47,211,122,.18),transparent_60%),radial-gradient(520px_320px_at_94%_135%,rgba(255,90,54,.12),transparent_60%)]">
      <div className="flex flex-wrap items-center gap-6">
        <div className="min-w-[250px] flex-1">
          <div className="text-on-emerald-mut text-[10.5px] font-bold uppercase tracking-[0.14em]">
            {variant === 'planos'
              ? `Sua receita recorrente · ${overview.monthLabel}`
              : 'Receita recorrente mensal · MRR'}
          </div>
          <div className="mt-2 flex flex-wrap items-baseline gap-2.5">
            <div className="text-green-bright font-serif text-[48px] leading-[0.88] tracking-tight">
              {metrics.mrrLabel}
            </div>
            <div className="text-on-emerald-mut text-[17px]">
              /mês{variant === 'receita' ? ` · ${metrics.subsLabel}` : ''}
            </div>
            {delta.show && (
              <DeltaPill
                positive={delta.positive}
                text={`${delta.mrrLabel} vs. ${delta.prevMonthLabel}`}
              />
            )}
          </div>
          <p className="text-on-emerald-mut mt-2.5 max-w-[440px] text-[13.5px] leading-snug">
            {variant === 'planos' ? (
              <>
                Com <strong className="text-on-emerald font-semibold">{metrics.subsLabel}</strong>{' '}
                pagando todo mês, sem você correr atrás.
                {delta.show && ` ${delta.subsLabel} desde ${delta.prevMonthLabel}.`}
              </>
            ) : (
              <>
                É o dinheiro que você já sabe que entra <em className="italic">antes</em> do mês
                começar. Assinatura é o que deixa o negócio previsível.
              </>
            )}
          </p>
        </div>
        {variant === 'planos' && (
          <div className="border-on-emerald/20 min-w-[216px] flex-[0_1_250px] rounded-2xl border bg-[rgba(47,211,122,.08)] px-[17px] py-[15px]">
            <div className="text-on-emerald-mut text-[10px] font-bold uppercase tracking-[0.13em]">
              Uso dos créditos
            </div>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="font-serif text-[30px]">{metrics.creditUsedLabel}</span>
              <span className="text-on-emerald-mut text-[12px]">usados este mês</span>
            </div>
            <div className="mt-3 h-[7px] overflow-hidden rounded-full bg-[rgba(250,245,234,.14)]">
              <div
                className="h-full rounded-full bg-[var(--brand-green-bright)] transition-[width] duration-500"
                // ponytail: runtime, Tailwind nao gera
                style={{ width: `${metrics.creditPct ?? 0}%` }}
              />
            </div>
            <div className="text-on-emerald-mut mt-2 text-[11px] leading-snug opacity-80">
              Quanto mais usam, mais fica difícil largar.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DeltaPill({ positive, text }: { positive: boolean; text: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1.5 text-[11.5px] font-bold ${
        positive
          ? 'bg-[rgba(47,211,122,.16)] text-[#7fe0aa]'
          : 'bg-[rgba(255,90,54,.18)] text-[#ffb3a0]'
      }`}
    >
      <ArrowUp className={`size-3 ${positive ? '' : 'rotate-180'}`} strokeWidth={2.6} />
      {text}
    </span>
  );
}

// ─── Aba Planos ───
function PlanosTab({
  overview,
  pending,
  onEdit,
  onTogglePause,
}: {
  overview: SubscriptionsOverview;
  pending: boolean;
  onEdit: (p: PlanRow) => void;
  onTogglePause: (p: PlanRow) => void;
}) {
  return (
    <>
      <MrrHero overview={overview} variant="planos" />
      <div className="flex flex-col gap-3">
        {overview.plans.map((p) => (
          <div
            key={p.id}
            className={`border-line bg-paper shadow-soft flex flex-wrap items-center gap-4 rounded-[18px] border px-[18px] py-4 ${
              p.active ? 'opacity-100' : 'opacity-[0.62]'
            }`}
          >
            <div className="bg-chip text-green-emph flex size-[46px] flex-none items-center justify-center rounded-[14px]">
              <Repeat className="size-5" />
            </div>
            <div className="min-w-[170px] flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-ink whitespace-nowrap font-serif text-[17.5px]">
                  {p.name}
                </span>
                <StatusPill active={p.active} />
              </div>
              <div className="text-ink-50 mt-1 text-[12px] font-medium">{p.servicesLabel}</div>
              <div className="text-ink-30 mt-0.5 text-[11.5px] font-medium">
                {p.creditsLabel} · {p.rolloverLabel}
              </div>
            </div>
            <MiniStat value={p.priceLabel} label="por mês" />
            <MiniStat value={String(p.activeCount)} label="ativos" accent />
            <MiniStat value={p.mrrLabel} label="recorrente" />
            <div className="flex flex-none items-center gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => onTogglePause(p)}
                className="border-line text-ink-70 hover:bg-cream-2 whitespace-nowrap rounded-full border px-3.5 py-2.5 text-[11.5px] font-semibold transition-colors disabled:opacity-50"
              >
                {p.active ? 'Pausar' : 'Retomar'}
              </button>
              <button
                type="button"
                onClick={() => onEdit(p)}
                title="Editar plano"
                aria-label={`Editar ${p.name}`}
                className="text-ink-30 hover:bg-cream-2 hover:text-ink-70 rounded-[10px] p-2 transition-colors"
              >
                <Pencil className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <p className="text-ink-50 text-[12px] leading-snug">
        Pausar tira o plano da vitrine, mas quem já assina continua com os créditos. Cancelar de vez
        é feito por assinante, na aba <strong className="font-semibold">Assinantes</strong>.
      </p>
    </>
  );
}

function MiniStat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="min-w-[80px] flex-none text-right">
      <div className={`font-serif text-[17px] ${accent ? 'text-green-emph' : 'text-ink'}`}>
        {value}
      </div>
      <div className="text-ink-50 text-[10.5px] font-medium">{label}</div>
    </div>
  );
}

function StatusPill({ active }: { active: boolean }) {
  return active ? (
    <span className="bg-chip text-green-emph inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-semibold">
      <span className="size-1.5 rounded-full bg-[var(--brand-green-bright)]" />
      Ativo
    </span>
  ) : (
    <span className="bg-cream-2 text-ink-50 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-semibold">
      <span className="bg-ink-30 size-1.5 rounded-full" />
      Pausado
    </span>
  );
}

// ─── Aba Assinantes ───
function AssinantesTab({
  groups,
  hasSubscribers,
  onHistory,
  onCancel,
}: {
  groups: PlanGroup[];
  hasSubscribers: boolean;
  onHistory: (row: SubscriberRow) => void;
  onCancel: (row: SubscriberRow) => void;
}) {
  if (!hasSubscribers) {
    return (
      <div className="border-edge bg-paper shadow-soft rounded-[20px] border border-dashed px-6 py-12 text-center">
        <div className="text-ink font-serif text-[18px]">Ninguém assinando ainda</div>
        <p className="text-ink-50 mx-auto mt-1.5 max-w-[360px] text-[13px] leading-snug">
          Assim que um cliente assinar um dos seus planos no app, ele aparece aqui - com os créditos
          e a próxima cobrança.
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {groups.map((g) => (
        <div
          key={g.planId}
          className="border-line bg-paper shadow-soft overflow-hidden rounded-[18px] border"
        >
          <div className="flex flex-wrap items-center gap-2.5 px-[18px] pb-2.5 pt-4">
            <div className="bg-chip text-green-emph flex size-[34px] flex-none items-center justify-center rounded-[11px]">
              <Repeat className="size-4" />
            </div>
            <span className="text-ink font-serif text-[16.5px]">{g.planName}</span>
            <span className="bg-cream-2 text-ink-70 rounded-full px-2 py-1 text-[11px] font-semibold">
              {g.priceLabel}/mês
            </span>
            <span className="text-ink-50 ml-auto text-[12px] font-medium">{g.countLabel}</span>
          </div>
          {g.rows.map((c) => (
            <div
              key={c.membershipId}
              className={`border-edge flex items-center gap-3.5 border-t border-dotted px-[18px] py-3 ${
                c.status === 'CANCELED' ? 'opacity-60' : 'opacity-100'
              }`}
            >
              <div className="bg-green-deep text-on-emerald flex size-[38px] flex-none items-center justify-center rounded-xl text-[12px] font-bold">
                {c.initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-ink truncate text-sm font-semibold">{c.name}</div>
                <div className="mt-1">
                  <SubscriberPill status={c.status} />
                </div>
              </div>
              <div className="w-[92px] flex-none text-right">
                <div className="text-ink font-serif text-[15px]">{c.creditBalance}</div>
                <div className="text-ink-50 text-[10px] font-medium">créditos no mês</div>
              </div>
              <div className="hidden w-[104px] flex-none text-right sm:block">
                <div className="text-ink text-[13px] font-semibold">{c.nextChargeLabel}</div>
                <div className="text-ink-50 text-[10px] font-medium">próxima cobrança</div>
              </div>
              <div className="flex flex-none gap-1">
                <button
                  type="button"
                  onClick={() => onHistory(c)}
                  title="Ver histórico"
                  aria-label={`Histórico de ${c.name}`}
                  className="text-ink-30 hover:bg-cream-2 hover:text-ink-70 rounded-[10px] p-2 transition-colors"
                >
                  <History className="size-4" />
                </button>
                {c.canCancel && (
                  <button
                    type="button"
                    onClick={() => onCancel(c)}
                    title="Cancelar assinatura"
                    aria-label={`Cancelar assinatura de ${c.name}`}
                    className="text-ink-30 hover:bg-coral-tint rounded-[10px] p-2 transition-colors hover:text-[#c2401f]"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function SubscriberPill({ status }: { status: SubscriberRow['status'] }) {
  const map = {
    ACTIVE: { label: 'Ativo', cls: 'bg-chip text-green-emph', dot: 'bg-green-bright' },
    PAST_DUE: { label: 'Inadimplente', cls: 'bg-coral-tint text-coral-deep', dot: 'bg-[#c2401f]' },
    CANCELED: { label: 'Cancelada', cls: 'bg-cream-2 text-ink-50', dot: 'bg-ink-50' },
  }[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-semibold ${map.cls}`}
    >
      <span className={`size-1.5 rounded-full ${map.dot}`} />
      {map.label}
    </span>
  );
}

// ─── Aba Receita ───
function ReceitaTab({ overview }: { overview: SubscriptionsOverview }) {
  const { trend, plans, metrics } = overview;
  const revenuePlans = plans.filter((p) => p.mrrCents > 0);
  const maxPlanMrr = Math.max(1, ...revenuePlans.map((p) => p.mrrCents));

  return (
    <>
      <MrrHero overview={overview} variant="receita" />

      <div className="grid grid-cols-1 items-start gap-3.5 lg:grid-cols-2">
        {trend.show && (
          <div className="border-line bg-paper shadow-soft rounded-[18px] border px-5 py-[18px]">
            <div className="text-ink font-serif text-base">Mês a mês, subindo</div>
            <p className="text-ink-50 mt-0.5 text-[12px]">
              Assinaturas recebidas nos últimos meses.
            </p>
            <div className="mt-4 flex h-[150px] items-end gap-2.5">
              {trend.points.map((t, i) => (
                <div
                  key={i}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                >
                  <div className="text-ink-50 text-[10.5px] font-semibold">{brl0(t.cents)}</div>
                  <div
                    className={`w-full rounded-t-lg transition-[height] duration-500 ${
                      t.isCurrent ? 'bg-green-bright' : 'bg-[#cfe8d6]'
                    }`}
                    // ponytail: runtime, Tailwind nao gera
                    style={{
                      height: `${Math.max(4, Math.round((t.cents / trend.maxCents) * 100))}%`,
                    }}
                  />
                  <div
                    className={`text-[11px] font-semibold ${t.isCurrent ? 'text-green-emph' : 'text-ink-50'}`}
                  >
                    {t.monthLabel}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-line bg-paper shadow-soft rounded-[18px] border px-5 py-[18px]">
          <div className="text-ink font-serif text-base">De onde vem</div>
          <p className="text-ink-50 mt-0.5 text-[12px]">Quanto cada plano rende por mês.</p>
          {revenuePlans.length === 0 ? (
            <p className="text-ink-50 py-6 text-center text-[13px]">
              Ainda sem receita recorrente. Ela aparece assim que o primeiro cliente assinar.
            </p>
          ) : (
            <div className="mt-4 flex flex-col gap-3.5">
              {revenuePlans.map((p) => (
                <div key={p.id}>
                  <div className="mb-1.5 flex items-baseline gap-2">
                    <span className="text-ink text-[13.5px] font-semibold">{p.name}</span>
                    <span className="text-ink-50 text-[11.5px] font-medium">
                      {p.activeCount} {p.activeCount === 1 ? 'assinante' : 'assinantes'}
                    </span>
                    <span className="text-green-emph ml-auto font-serif text-[14px]">
                      {p.mrrLabel}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#efe9d8]">
                    <div
                      className="bg-green-bright h-full rounded-full transition-[width] duration-500"
                      // ponytail: runtime, Tailwind nao gera
                      style={{ width: `${Math.round((p.mrrCents / maxPlanMrr) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="border-line bg-paper shadow-soft flex flex-wrap items-center gap-4 rounded-[18px] border px-5 py-[18px]">
        <div className="min-w-[220px] flex-1">
          <div className="text-ink flex items-center gap-2 font-serif text-base">
            <TrendingUp className="text-green-emph size-4" />
            Seus assinantes usaram{' '}
            <em className="text-green-emph not-italic">{metrics.creditUsedLabel}</em> dos créditos
          </div>
          <p className="text-ink-70 mt-1 max-w-[440px] text-[12.5px] leading-snug">
            Uso alto é ótimo sinal: cliente que aproveita o plano volta sempre e quase não cancela.
            Uso muito baixo pode virar cancelamento - vale um empurrãozinho.
          </p>
        </div>
        <div className="min-w-[180px] flex-[0_1_200px]">
          <div className="flex items-baseline gap-1.5">
            <span className="text-ink font-serif text-[34px]">{metrics.creditUsedLabel}</span>
            <span className="text-ink-50 text-[12px]">este mês</span>
          </div>
          <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-[#efe9d8]">
            <div
              className="h-full rounded-full bg-[var(--brand-green-bright)]"
              // ponytail: runtime, Tailwind nao gera
              style={{ width: `${metrics.creditPct ?? 0}%` }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
