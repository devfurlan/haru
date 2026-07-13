'use client';

// Vitrine de assinatura (Clube) na página pública do estabelecimento + checkout em modal.
// Só aparece quando o dono tem plano ativo e criou planos (gate Time+ aplicado no server).
// Regras: crédito é descontado automático no agendamento (sem pergunta); sem crédito agenda
// pagando avulso; o cliente PRECISA saber a regra de acúmulo/vencimento; assinar exige conta.
// Visual espelha o resto da página pública (paper/cream/coral/esmeralda, Fraunces).

import {
  ArrowRight,
  Check,
  Copy,
  CreditCard,
  Infinity as InfinityIcon,
  Loader2,
  QrCode,
  RefreshCw,
  Smartphone,
  Sparkles,
  User as UserIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';

import { CustomerSignupForm } from '@/app/(customer)/conta/(public)/criar/signup-form';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatBRL, isValidCpfCnpj, maskCpfCnpjInput } from '@haru/shared';
import { cn } from '@/lib/utils';

import { subscribeToPlan } from './subscription-actions';

export interface PublicPlan {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  creditsPerCycle: number;
  creditRollover: boolean;
  rolloverCap: number | null;
  /** Nomes dos serviços cobertos (já resolvidos no server). */
  serviceNames: string[];
}

/** Estado da assinatura do cliente logado NESTE plano (quando já assina). */
export interface PlanMembershipState {
  planId: string;
  status: 'PENDING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';
  /** "3 de 4". */
  creditsLabel: string;
  payFailed: boolean;
  /** "Renova dia 12" (ACTIVE). */
  renewsLabel: string | null;
}

/** "Corte, Barba +1" - no máx. 2 nomes, resto vira contador. */
function labelServices(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length <= 2) return names.join(', ');
  return `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
}

/** Frase curta da regra de crédito, em DESTAQUE (o cliente tem que saber). */
function ruleShort(plan: PublicPlan): string {
  if (!plan.creditRollover) return 'Créditos vencem no fim do mês';
  return plan.rolloverCap
    ? `Sobra acumula pro mês seguinte (até ${plan.rolloverCap})`
    : 'Sobra acumula pro mês seguinte, sem limite';
}

/** Chip da regra (acumula = esmeralda; vence = neutro). */
function RuleChip({ plan }: { plan: PublicPlan }) {
  const rollover = plan.creditRollover;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-semibold',
        rollover ? 'bg-chip text-[#14513a]' : 'text-ink-70 bg-[#f2ecdd]',
      )}
    >
      {rollover ? (
        <InfinityIcon className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <RefreshCw className="h-3.5 w-3.5" aria-hidden />
      )}
      {ruleShort(plan)}
    </span>
  );
}

/** Card de um plano na vitrine. Se o cliente já assina, mostra o estado; senão, "Assinar". */
function PlanCard({
  plan,
  membership,
  onSubscribe,
}: {
  plan: PublicPlan;
  membership: PlanMembershipState | null;
  onSubscribe: () => void;
}) {
  // "Assinante" = tem uma linha viva (ativando/em dia/em atraso). CANCELED cai como
  // não-assinante (pode reassinar) - a engine reusa a linha cancelada.
  const subscribed = membership && membership.status !== 'CANCELED' ? membership.status : null;
  const covered = labelServices(plan.serviceNames);

  return (
    <div className="border-line bg-paper flex flex-col gap-3.5 rounded-[18px] border p-[18px] shadow-[0_2px_10px_rgba(10,51,36,.05)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-serif text-[18px] font-semibold leading-tight">{plan.name}</p>
          {covered ? <p className="text-ink-50 mt-1 text-[12.5px] font-medium">{covered}</p> : null}
        </div>
        <div className="shrink-0 text-right">
          <p className="font-serif text-[22px] font-semibold leading-none">
            {formatBRL(plan.priceCents)}
          </p>
          <p className="text-ink-50 mt-1 text-[11px] font-medium">/mês</p>
        </div>
      </div>

      {plan.description ? (
        <p className="text-ink-70 text-[13px] leading-[1.55]">{plan.description}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <span className="bg-green-deep text-cream inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-semibold">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          {plan.creditsPerCycle} {plan.creditsPerCycle === 1 ? 'uso' : 'usos'} por mês
        </span>
        <RuleChip plan={plan} />
      </div>

      {subscribed === 'ACTIVE' ? (
        <div className="border-green/25 bg-green/5 flex items-center gap-2.5 rounded-[14px] border px-3.5 py-3">
          <Check className="text-green h-4 w-4 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-foreground text-[13px] font-semibold">
              Você assina · {membership!.creditsLabel} usos
            </p>
            {membership!.renewsLabel ? (
              <p className="text-sub text-[11.5px]">{membership!.renewsLabel}</p>
            ) : null}
          </div>
          <Link
            href="/conta/assinaturas"
            className="text-coral shrink-0 text-[12.5px] font-semibold underline-offset-2 hover:underline"
          >
            Gerenciar
          </Link>
        </div>
      ) : subscribed === 'PAST_DUE' ? (
        <div className="flex items-center gap-2.5 rounded-[14px] border border-amber-300/70 bg-amber-50/50 px-3.5 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-amber-700">Pagamento pendente</p>
            <p className="text-sub text-[11.5px]">Regularize pra reativar seus créditos.</p>
          </div>
          <Link
            href="/conta/assinaturas"
            className="text-coral shrink-0 text-[12.5px] font-semibold underline-offset-2 hover:underline"
          >
            Gerenciar
          </Link>
        </div>
      ) : subscribed === 'PENDING' ? (
        <div className="bg-muted text-sub flex items-center gap-2 rounded-[14px] border px-3.5 py-3 text-[12.5px]">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Ativando sua assinatura…
        </div>
      ) : (
        <button
          type="button"
          onClick={onSubscribe}
          className="bg-coral shadow-coral mt-0.5 rounded-[14px] py-3 text-center text-[14px] font-semibold text-white transition-transform active:scale-[0.98]"
        >
          Assinar
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Checkout em modal: gate de conta -> resumo + pagamento -> confirmação
// ---------------------------------------------------------------------------

/** Convite leve e não-bloqueante pro app, na confirmação (não é modal - é conteúdo). */
function AppNudge() {
  return (
    <div className="bg-card flex items-center gap-3 rounded-[16px] border border-dashed border-[#d9cfb6] p-3.5 text-left">
      <Smartphone className="text-sub h-5 w-5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-foreground text-[12.5px] font-semibold">
          Tem o app? Acompanhe seus créditos e agende mais rápido.
        </p>
        {/* TODO(app): link real das stores quando o app publicar. */}
        <p className="text-sub text-[11.5px]">Sem depender do WhatsApp.</p>
      </div>
    </div>
  );
}

/** Resumo do plano dentro do checkout (nome, preço/mês, usos, regra, cobertura). */
function PlanSummary({ plan }: { plan: PublicPlan }) {
  const covered = labelServices(plan.serviceNames);
  return (
    <div className="border-edge bg-paper space-y-2.5 rounded-[16px] border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-foreground font-serif text-[16px] font-semibold">{plan.name}</p>
          {covered ? <p className="text-sub mt-0.5 text-[12px]">{covered}</p> : null}
        </div>
        <p className="text-foreground shrink-0 font-serif text-[18px] font-semibold">
          {formatBRL(plan.priceCents)}
          <span className="text-sub text-[11px] font-medium">/mês</span>
        </p>
      </div>
      <div className="border-edge border-t border-dashed" />
      <div className="text-sub flex items-center gap-1.5 text-[12.5px]">
        <Sparkles className="text-green-deep h-3.5 w-3.5 shrink-0" aria-hidden />
        {plan.creditsPerCycle} {plan.creditsPerCycle === 1 ? 'uso' : 'usos'} por mês ·{' '}
        {plan.creditRollover ? 'acumula' : 'vence no mês'}
      </div>
      <p className="text-sub text-[11.5px] leading-[1.5]">
        {ruleShort(plan)}. Os créditos são descontados sozinhos quando você agenda um serviço do
        plano - sem crédito, você agenda pagando normal. Cancele quando quiser na sua conta.
      </p>
    </div>
  );
}

function SubscribeDialog({
  slug,
  plan,
  loggedIn,
  onClose,
}: {
  slug: string;
  plan: PublicPlan | null;
  loggedIn: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  // Conta criada agora pelo gate inline: sobe o passo pro pagamento sem sair do modal.
  const [authed, setAuthed] = useState(false);
  const hasAccount = loggedIn || authed;

  const [submitting, startSubmit] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [askDocument, setAskDocument] = useState(false);
  const [document, setDocument] = useState('');
  const documentRef = useRef<HTMLInputElement>(null);
  // Confirmação pós-checkout: cartão abre a fatura hospedada; Pix mostra QR/copia-e-cola.
  const [done, setDone] = useState<{
    checkoutUrl: string | null;
    pixQrCode: string | null;
    pixCopyPaste: string | null;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Reseta o estado a cada plano aberto (o modal é reaproveitado entre planos).
  useEffect(() => {
    setAuthed(false);
    setError(null);
    setAskDocument(false);
    setDocument('');
    setDone(null);
  }, [plan?.id]);

  useEffect(() => {
    if (askDocument) documentRef.current?.focus();
  }, [askDocument]);

  function handleAuthenticated() {
    setAuthed(true);
    router.refresh();
  }

  function subscribe(method: 'CREDIT_CARD' | 'PIX') {
    if (submitting || !plan) return;
    if (askDocument && !isValidCpfCnpj(document)) {
      setError('CPF inválido. Confira os números e tente de novo.');
      documentRef.current?.focus();
      return;
    }
    setError(null);
    startSubmit(async () => {
      const result = await subscribeToPlan(slug, plan.id, method, document || undefined);
      if ('error' in result) {
        setError(result.error);
        if ('needsDocument' in result && result.needsDocument) setAskDocument(true);
        return;
      }
      setDone({
        checkoutUrl: result.checkoutUrl,
        pixQrCode: result.pixQrCode,
        pixCopyPaste: result.pixCopyPaste,
      });
      if (method === 'CREDIT_CARD' && result.checkoutUrl) {
        window.open(result.checkoutUrl, '_blank', 'noopener,noreferrer');
      }
    });
  }

  const open = plan != null;

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? null : onClose())}>
      <DialogContent dismissable={false} className="max-w-sm">
        {!plan ? null : done ? (
          // --- Confirmação (assinatura sendo ativada) --------------------------
          <div className="space-y-5">
            <div className="text-center">
              <div className="border-green/25 bg-green/10 mx-auto flex h-[68px] w-[68px] items-center justify-center rounded-[22px] border">
                <Check className="text-green h-8 w-8" strokeWidth={2.4} aria-hidden />
              </div>
              <h2 className="text-foreground mt-4 font-serif text-[26px] font-medium leading-tight">
                Falta <span className="text-green-deep italic">pouco!</span>
              </h2>
            </div>

            {done.pixQrCode || done.pixCopyPaste ? (
              <div className="space-y-3">
                <p className="text-sub text-center text-[13px] leading-relaxed">
                  Pague o Pix abaixo pra ativar sua assinatura. Os créditos entram assim que o
                  pagamento cair.
                </p>
                {done.pixQrCode ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={done.pixQrCode}
                    alt="QR Code do Pix"
                    className="mx-auto h-44 w-44 rounded-lg border bg-white p-2"
                  />
                ) : null}
                {done.pixCopyPaste ? (
                  <div className="flex items-center gap-2">
                    <code className="bg-muted flex-1 break-all rounded px-2 py-1 text-[11px]">
                      {done.pixCopyPaste}
                    </code>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={() => {
                        if (!done.pixCopyPaste) return;
                        navigator.clipboard.writeText(done.pixCopyPaste).then(() => {
                          setCopied(true);
                          setTimeout(() => setCopied(false), 1500);
                        });
                      }}
                    >
                      <Copy className="mr-1 h-3 w-3" />
                      {copied ? 'Copiado' : 'Copiar'}
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-sub text-center text-[13.5px] leading-relaxed">
                Abrimos o pagamento numa nova aba. Assim que você concluir, ativamos sua assinatura
                e seus créditos entram na hora - a gente te avisa.
                {done.checkoutUrl ? (
                  <>
                    {' '}
                    <button
                      type="button"
                      onClick={() =>
                        window.open(done.checkoutUrl!, '_blank', 'noopener,noreferrer')
                      }
                      className="text-coral font-semibold underline underline-offset-2"
                    >
                      Reabrir pagamento
                    </button>
                  </>
                ) : null}
              </p>
            )}

            <AppNudge />

            <div className="flex flex-col gap-2">
              <Link
                href="/conta/assinaturas"
                className="bg-coral rounded-[14px] py-3 text-center text-[14px] font-semibold text-white transition-transform active:scale-[0.98]"
              >
                Ver minha assinatura
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="text-sub hover:text-foreground py-1 text-center text-[12.5px] font-medium"
              >
                Fechar
              </button>
            </div>
          </div>
        ) : !hasAccount ? (
          // --- Gate de conta (assinar exige conta) -----------------------------
          <div className="space-y-3">
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl font-semibold">
                Crie sua conta pra assinar
              </DialogTitle>
            </DialogHeader>
            <p className="text-sub -mt-1 text-sm leading-relaxed">
              Assinatura é uma relação recorrente - precisa de uma conta pra guardar seus créditos,
              o histórico de cobrança e te avisar das renovações. É rapidinho, e você não perde o
              plano escolhido.
            </p>
            <CustomerSignupForm inline onSuccess={handleAuthenticated} />
            <p className="text-sub text-center text-[11px]">
              Já tem conta?{' '}
              <Link
                href={`/login?next=/${slug}`}
                className="text-coral font-semibold underline underline-offset-2"
              >
                <UserIcon className="mr-0.5 inline h-3 w-3" />
                Entrar
              </Link>
            </p>
            <p className="text-sub flex items-center justify-center gap-1 text-center text-[11px]">
              <ArrowRight className="h-3 w-3" aria-hidden />
              Depois de entrar, você volta pra concluir a assinatura.
            </p>
          </div>
        ) : (
          // --- Resumo + pagamento ---------------------------------------------
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl font-semibold">
                Assinar {plan.name}
              </DialogTitle>
            </DialogHeader>

            <PlanSummary plan={plan} />

            {askDocument ? (
              <div className="space-y-1.5">
                <Label htmlFor="subscribe-document">CPF</Label>
                <Input
                  id="subscribe-document"
                  ref={documentRef}
                  name="subscribe-document"
                  type="text"
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  value={maskCpfCnpjInput(document)}
                  onChange={(e) => setDocument(e.target.value.replace(/\D/g, '').slice(0, 14))}
                  aria-invalid={document.length > 0 && !isValidCpfCnpj(document)}
                  aria-describedby="subscribe-document-hint"
                />
                <p id="subscribe-document-hint" className="text-sub text-xs">
                  O gateway exige seu CPF pra emitir a cobrança recorrente.
                </p>
              </div>
            ) : null}

            {error ? (
              <p
                role="alert"
                className="border-destructive/40 bg-destructive/5 text-destructive rounded-lg border p-3 text-sm"
              >
                {error}
              </p>
            ) : null}

            <div className="space-y-2">
              <Button
                type="button"
                variant="coral"
                className="w-full"
                disabled={submitting}
                onClick={() => subscribe('CREDIT_CARD')}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                {submitting ? 'Abrindo…' : 'Assinar no cartão'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={submitting}
                onClick={() => subscribe('PIX')}
              >
                <QrCode className="mr-2 h-4 w-4" />
                Pagar 1ª cobrança no Pix
              </Button>
            </div>
            <p className="text-sub text-center text-[11px] leading-[1.5]">
              Cobrança mensal de {formatBRL(plan.priceCents)}. Você cancela quando quiser na sua
              conta.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Seção da vitrine
// ---------------------------------------------------------------------------

export function SubscriptionPlans({
  slug,
  plans,
  memberships,
  loggedIn,
}: {
  slug: string;
  plans: PublicPlan[];
  /** Assinaturas do cliente logado NESTE tenant, por planId. */
  memberships: PlanMembershipState[];
  loggedIn: boolean;
}) {
  const [checkout, setCheckout] = useState<PublicPlan | null>(null);
  if (plans.length === 0) return null;

  const byPlan = new Map(memberships.map((m) => [m.planId, m]));

  return (
    <section>
      <h2 className="mb-1 font-serif text-[22px] font-medium tracking-[-0.02em]">
        Assine e economize
      </h2>
      <p className="text-ink-50 mb-3 text-[13.5px] font-medium">
        Pague um valor fixo por mês e agende usando créditos, sem pagar a cada visita.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            membership={byPlan.get(plan.id) ?? null}
            onSubscribe={() => setCheckout(plan)}
          />
        ))}
      </div>

      <SubscribeDialog
        slug={slug}
        plan={checkout}
        loggedIn={loggedIn}
        onClose={() => setCheckout(null)}
      />
    </section>
  );
}
