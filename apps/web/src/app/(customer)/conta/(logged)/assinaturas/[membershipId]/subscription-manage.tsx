'use client';

import { AlertTriangle, Calendar, Check, Loader2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useState, useTransition } from 'react';

import { cn } from '@/lib/utils';
import type { CustomerMembershipDetail } from '@/lib/memberships/customer';

import { cancelMembership } from '../actions';

/** Linha embaixo do saldo no herói, conforme o status da assinatura. */
function heroSubline(m: CustomerMembershipDetail): string {
  if (m.status === 'ACTIVE') return m.renewsLabel ?? 'Renova todo mês';
  if (m.status === 'PAST_DUE') return 'Créditos pausados até regularizar';
  if (m.status === 'CANCELED')
    return m.periodEndLabel ? `Créditos valem até ${m.periodEndLabel}` : 'Assinatura encerrada';
  return 'Ativando sua assinatura…';
}

export function SubscriptionManage({ detail: m }: { detail: CustomerMembershipDetail }) {
  const [tab, setTab] = useState<'creditos' | 'cobrancas'>('creditos');
  const [cancelStage, setCancelStage] = useState<'idle' | 'ask' | 'done'>('idle');
  const [canceling, startCancel] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function doCancel() {
    setError(null);
    startCancel(async () => {
      const res = await cancelMembership(m.membershipId);
      if ('error' in res) {
        setError(res.error);
        return;
      }
      setCancelStage('done');
    });
  }

  const pips = Array.from({ length: Math.min(m.creditsPerCycle, 12) }, (_, i) => i < m.creditBalance);
  const canBook = m.creditsUsable && m.creditBalance > 0;

  return (
    <div className="mt-5">
      <h1 className="text-ink font-serif text-[28px] tracking-tight md:text-[34px]">
        Sua <span className="text-green-deep italic">assinatura</span>
      </h1>
      <p className="text-ink-50 mt-1.5 text-sm">
        {m.planName} · {m.tenantName}
      </p>

      {/* Pagamento falhou: estado HONESTO. Não há form de cartão (checkout hospedado do gateway
          do estabelecimento); ele retenta sozinho e o dono ajuda a trocar o cartão. */}
      {m.payFailed ? (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-[#f2c6b8] bg-[#fbeee9] p-4">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#ffe1d7]">
            <AlertTriangle className="h-5 w-5 text-[#c2401f]" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-serif text-[15px] font-semibold text-[#a8391b]">
              Não conseguimos cobrar sua mensalidade
            </div>
            <p className="mt-1 text-[13px] leading-relaxed text-[#8f4a37]">
              A cobrança de {m.priceLabel}
              {m.cardLabel ? ` (${m.cardLabel})` : ''} falhou e seus créditos ficam pausados até
              regularizar. Tentamos de novo automaticamente nos próximos dias - se o cartão mudou,
              fale com {m.tenantName} pra atualizar.
            </p>
            <Link
              href={`/${m.tenantSlug}`}
              className="mt-3 inline-block rounded-xl bg-[#FF5A36] px-4 py-2.5 text-[13px] font-bold text-white transition-transform hover:-translate-y-0.5"
            >
              Falar com {m.tenantName}
            </Link>
          </div>
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 md:grid-cols-[1.25fr_1fr]">
        {/* Herói de créditos (linguagem visual distinta do carimbo de fidelidade). */}
        <div className="bg-green-deep relative overflow-hidden rounded-[24px] p-6 shadow-[0_26px_50px_-22px_rgba(4,20,13,.55)]">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(320px 200px at 92% 0%, rgba(47,211,122,.2), transparent), radial-gradient(260px 180px at 4% 100%, rgba(255,90,54,.1), transparent)',
            }}
          />
          <div className="relative">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-on-emerald-mut truncate text-[10px] font-bold uppercase tracking-[0.14em]">
                  {m.planName} · {m.tenantName}
                </div>
                <div className="mt-2.5 flex items-baseline gap-2">
                  <span className="text-cream font-serif text-[46px] font-semibold leading-[0.9] tracking-tight">
                    {m.creditBalance}
                  </span>
                  <span className="text-on-emerald-mut font-serif text-[16px]">
                    de {m.creditsPerCycle} créditos
                  </span>
                </div>
                <div className="text-on-emerald-mut mt-1.5 text-[13px] font-medium">
                  {heroSubline(m)}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                {pips.map((filled, i) => (
                  <span
                    key={i}
                    className="size-[15px] rounded-full"
                    style={
                      filled
                        ? { background: 'var(--brand-green-bright)' }
                        : { border: '1.5px solid rgba(250,245,234,.28)' }
                    }
                  />
                ))}
              </div>
            </div>

            {/* Regra do plano em DESTAQUE (não letra miúda). */}
            <div className="mt-4 flex items-center gap-2.5 rounded-[13px] border border-[rgba(47,211,122,.2)] bg-[rgba(47,211,122,.08)] px-3.5 py-3">
              <Sparkles
                className="h-4 w-4 shrink-0"
                style={{ color: 'var(--brand-green-bright)' }}
                aria-hidden
              />
              <span className="text-[12.5px] leading-snug text-[#cfeeda]">{m.ruleLong}</span>
            </div>

            <Link
              href={`/${m.tenantSlug}`}
              className={cn(
                'mt-4 block rounded-[13px] py-3.5 text-center text-[14px] font-bold transition-transform hover:-translate-y-0.5',
                canBook
                  ? 'bg-coral text-white'
                  : 'text-cream border border-[rgba(143,191,164,.35)]',
              )}
            >
              {canBook ? 'Agendar com crédito' : `Ver ${m.tenantName}`}
            </Link>
          </div>
        </div>

        {/* Detalhes do plano */}
        <div className="border-line bg-paper flex flex-col gap-3.5 rounded-[20px] border p-[22px]">
          <div className="text-ink font-serif text-[17px] font-semibold">Detalhes do plano</div>
          <div className="flex items-baseline justify-between">
            <span className="text-ink-50 text-[13px]">Mensalidade</span>
            <span className="text-ink font-serif text-[18px] font-semibold">
              {m.priceLabel}
              <span className="text-ink-30 font-sans text-[11px] font-medium">/mês</span>
            </span>
          </div>
          <div className="h-px bg-[repeating-linear-gradient(90deg,#e2d9c4_0_6px,transparent_6px_12px)]" />
          <div className="text-ink-70 flex items-center gap-2.5 text-[12.5px] font-medium">
            <Check className="h-4 w-4 shrink-0 text-[#1b7a4b]" strokeWidth={2.6} aria-hidden />
            {m.creditsPerCycle} créditos por mês
          </div>
          <div className="text-ink-70 flex items-center gap-2.5 text-[12.5px] font-medium">
            <Check className="h-4 w-4 shrink-0 text-[#1b7a4b]" strokeWidth={2.6} aria-hidden />
            {m.rollover
              ? `Acumulam${m.creditsExpireLabel ? '' : ' pro mês seguinte'}`
              : 'Vencem no fim do mês'}
          </div>
          <div className="h-px bg-[repeating-linear-gradient(90deg,#e2d9c4_0_6px,transparent_6px_12px)]" />
          <div className="text-ink-50 flex items-center gap-2.5 text-[12.5px]">
            <Calendar className="h-4 w-4 shrink-0" aria-hidden />
            {m.status === 'ACTIVE' && m.nextChargeLabel
              ? `Próxima cobrança ${m.nextChargeLabel}`
              : m.status === 'PAST_DUE'
                ? 'Cobrança pendente'
                : m.status === 'CANCELED' && m.periodEndLabel
                  ? `Créditos valem até ${m.periodEndLabel}`
                  : 'Aguardando ativação'}
            {m.cardLabel ? ` · ${m.cardLabel}` : ''}
          </div>
        </div>
      </div>

      {/* Abas: Créditos (movimento) / Cobranças (pagamentos) */}
      <div className="mt-7 flex gap-2">
        {(
          [
            ['creditos', 'Créditos'],
            ['cobrancas', 'Cobranças'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              'rounded-full border px-[18px] py-2.5 text-[13px] font-semibold transition-colors',
              tab === key
                ? 'bg-chip border-transparent text-green-deep'
                : 'border-line text-sub hover:bg-cream-2',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'creditos' ? (
        m.creditActivity.length > 0 ? (
          <div className="border-line bg-paper mt-3.5 overflow-hidden rounded-[16px] border">
            {m.creditActivity.map((a, i) => {
              const positive = a.delta > 0;
              return (
                <div
                  key={i}
                  className={cn(
                    'flex items-center gap-3 px-[18px] py-[15px]',
                    i < m.creditActivity.length - 1 && 'border-edge border-b',
                  )}
                >
                  <div
                    className={cn(
                      'grid size-9 shrink-0 place-items-center rounded-[11px] font-serif text-[13px] font-bold',
                      positive ? 'text-green-emph bg-chip' : 'bg-[#ffeee9] text-[#c2401f]',
                    )}
                  >
                    {positive ? '+' : ''}
                    {a.delta}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-ink truncate text-[14px] font-semibold">{a.label}</div>
                    <div className="text-ink-30 text-[12px] font-medium">
                      {a.dateLabel}
                      {a.sub ? ` · ${a.sub}` : ''}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-ink-50 mt-3.5 text-sm">
            Sem movimento ainda - ele aparece quando você usa ou renova créditos.
          </p>
        )
      ) : m.history.length > 0 ? (
        <div className="border-line bg-paper mt-3.5 overflow-hidden rounded-[16px] border">
          {m.history.map((h, i) => (
            <div
              key={i}
              className={cn(
                'flex items-center gap-3 px-[18px] py-[15px]',
                i < m.history.length - 1 && 'border-edge border-b',
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="text-ink text-[14px] font-semibold">
                  {h.amountLabel} · {m.planName}
                </div>
                <div className="text-ink-30 text-[12px] font-medium">
                  {h.dateLabel}
                  {m.cardLabel ? ` · ${m.cardLabel}` : ''}
                </div>
              </div>
              <span
                className={cn(
                  'shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-bold',
                  h.paid ? 'text-green-emph bg-chip' : 'bg-[#f2ecdd] text-[#8a6a25]',
                )}
              >
                {h.statusLabel}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-ink-50 mt-3.5 text-sm">Nenhuma cobrança registrada ainda.</p>
      )}

      {/* Cancelar (fácil de achar; confirmação clara sobre os créditos restantes) */}
      {m.canCancel ? (
        <div className="mt-6 border-t border-[#ece3cf] pt-6">
          {cancelStage === 'idle' ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-ink-30 max-w-[360px] text-[13px] leading-relaxed">
                Pode cancelar quando quiser - os créditos que já tem valem até a próxima renovação.
              </p>
              <button
                type="button"
                onClick={() => setCancelStage('ask')}
                className="border-line text-sub rounded-xl border bg-transparent px-[18px] py-3 text-[13px] font-bold transition-colors hover:border-[#c2401f] hover:text-[#c2401f]"
              >
                Cancelar assinatura
              </button>
            </div>
          ) : null}

          {cancelStage === 'ask' ? (
            <div className="border-line bg-paper max-w-[520px] rounded-[20px] border p-[22px]">
              <div className="flex items-start gap-3">
                <div className="grid size-11 shrink-0 place-items-center rounded-[13px] bg-[#fbeee9]">
                  <AlertTriangle className="h-[22px] w-[22px] text-[#c2401f]" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-ink font-serif text-[21px] leading-tight tracking-tight">
                    Quer mesmo <span className="italic text-[#c2401f]">cancelar</span>?
                  </div>
                  <p className="text-ink-50 mt-1.5 text-[13px] leading-relaxed">
                    Sua assinatura de {m.planName} para de renovar
                    {m.periodEndLabel ? ` no dia ${m.periodEndLabel}` : ''}.
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2.5 rounded-[14px] border border-[#ece3cf] bg-[#f6f1e4] p-[15px]">
                <div className="text-ink-70 flex items-start gap-2.5 text-[12.5px] leading-relaxed">
                  <Check className="mt-px h-4 w-4 shrink-0 text-[#1b7a4b]" strokeWidth={2.4} aria-hidden />
                  <span>
                    {m.creditBalance > 0 ? (
                      <>
                        Você ainda usa os{' '}
                        <strong className="text-ink font-semibold">
                          {m.creditBalance} {m.creditBalance === 1 ? 'crédito' : 'créditos'}
                        </strong>{' '}
                        que tem{m.periodEndLabel ? ` até ${m.periodEndLabel}` : ' até o fim do ciclo'}.
                      </>
                    ) : (
                      'Você não perde nada do que já pagou.'
                    )}
                  </span>
                </div>
                <div className="text-ink-70 flex items-start gap-2.5 text-[12.5px] leading-relaxed">
                  <Check className="mt-px h-4 w-4 shrink-0 text-[#1b7a4b]" strokeWidth={2.4} aria-hidden />
                  <span>
                    Depois volta a pagar avulso, normal.{' '}
                    <strong className="text-ink font-semibold">Sem multa, sem ligação.</strong>
                  </span>
                </div>
              </div>

              {error ? (
                <p
                  role="alert"
                  className="border-destructive/40 bg-destructive/5 text-destructive mt-3 rounded-lg border p-3 text-sm"
                >
                  {error}
                </p>
              ) : null}

              <div className="mt-4 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setCancelStage('idle')}
                  disabled={canceling}
                  className="bg-coral flex-1 rounded-[13px] py-3.5 text-[14px] font-bold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-60"
                >
                  Quero manter
                </button>
                <button
                  type="button"
                  onClick={doCancel}
                  disabled={canceling}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-[13px] border border-[#ded3ba] bg-transparent px-[18px] py-3.5 text-[14px] font-bold text-[#c2401f] transition-colors hover:border-[#e0a390] hover:bg-[#f9ece7] disabled:opacity-60"
                >
                  {canceling ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                  Cancelar
                </button>
              </div>
            </div>
          ) : null}

          {cancelStage === 'done' ? (
            <div className="border-line bg-paper max-w-[520px] rounded-[20px] border p-[26px] text-center">
              <div className="mx-auto grid size-[58px] place-items-center rounded-full border-[1.5px] border-[#e2d9c4] bg-[#f6f1e4]">
                <Check className="h-[26px] w-[26px] text-[#7c8a80]" strokeWidth={2.4} aria-hidden />
              </div>
              <div className="text-ink mt-4 font-serif text-[22px] tracking-tight">
                Assinatura <span className="italic text-[#7c8a80]">cancelada</span>
              </div>
              <p className="text-ink-50 mx-auto mt-2 max-w-[340px] text-[13px] leading-relaxed">
                Não renova mais.
                {m.creditBalance > 0
                  ? ` Seus ${m.creditBalance} ${m.creditBalance === 1 ? 'crédito' : 'créditos'} valem até ${m.periodEndLabel ?? 'o fim do ciclo'}.`
                  : ''}{' '}
                Se bater saudade, é só assinar de novo.
              </p>
              <Link
                href="/conta/assinaturas"
                className="bg-green-deep text-cream mt-[18px] inline-block rounded-[13px] px-[26px] py-3 text-[13.5px] font-bold transition-transform hover:-translate-y-0.5"
              >
                Voltar
              </Link>
            </div>
          ) : null}
        </div>
      ) : m.canceled ? (
        <div className="text-ink-50 mt-6 border-t border-[#ece3cf] pt-6 text-[13px]">
          Assinatura cancelada.
          {m.periodEndLabel ? ` Seus créditos valem até ${m.periodEndLabel}.` : ''}
        </div>
      ) : null}
    </div>
  );
}
