'use client';

// Tela de confirmação de vaga - o link do WhatsApp/push da fila abre aqui. Mostra TODOS os
// horários livres do dia com aquele profissional e um timer (janela do tenant, default
// 15 min). Estados de borda: alguém pegou antes, timer expirado (mantém posição), link
// expirado. Dados/ações via ../../queue-actions (adapter da engine real waitlist.ts).

import { ArrowRight, BellRing, Check, Clock, Loader2, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';

import { cn } from '@/lib/utils';

import { confirmQueueSlot, type QueueOffer, type QueueSlot } from '../../queue-actions';

function mmss(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function QueueConfirm({
  slug,
  offerId,
  entryId,
  tenantName,
  offer: initialOffer,
}: {
  slug: string;
  offerId: string;
  entryId: string;
  tenantName: string;
  offer: QueueOffer;
}) {
  const [offer, setOffer] = useState<QueueOffer>(initialOffer);
  const [selectedIso, setSelectedIso] = useState('');
  const [success, setSuccess] = useState<{
    whenLabel: string;
    serviceName: string;
    professionalName: string | null;
    priceLabel: string | null;
  } | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirming, startConfirm] = useTransition();

  // Timer: conta até expiresAt (verdade do servidor). `now` só depois de montar, pra não
  // divergir no SSR. Antes disso, mostra a janela cheia (determinístico).
  const active = offer.state === 'active';
  const expiresAt = active ? new Date(offer.expiresAtIso).getTime() : 0;
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);
  const secondsLeft =
    now == null
      ? active
        ? offer.confirmWindowSeconds
        : 0
      : Math.max(0, Math.round((expiresAt - now) / 1000));
  const timedOut = now != null && active && secondsLeft <= 0;

  function handleConfirm() {
    if (!selectedIso) return;
    setConfirmError(null);
    // Contexto de exibição capturado AGORA (a oferta ainda tem serviço/pro/preço); a tela
    // de sucesso é montada localmente (a engine só devolve ok/erro na confirmação).
    const o = offer;
    const chosen = ('slots' in o ? o.slots : []).find((s) => s.startsAtIso === selectedIso);
    const day =
      'dayLabel' in o && o.dayLabel ? o.dayLabel.charAt(0).toUpperCase() + o.dayLabel.slice(1) : '';
    const ctx = {
      serviceName: 'serviceName' in o ? o.serviceName : '',
      professionalName: 'professionalName' in o ? o.professionalName : null,
      priceLabel: 'priceLabel' in o ? o.priceLabel : null,
    };
    startConfirm(async () => {
      const res = await confirmQueueSlot(slug, offerId, entryId, selectedIso);
      if ('ok' in res) {
        setSuccess({
          whenLabel: day ? `${day} · ${chosen?.label ?? ''}` : (chosen?.label ?? ''),
          ...ctx,
        });
        return;
      }
      if ('state' in res && res.state === 'taken') {
        // Esse horário acabou de ser pego: usa os horários que o servidor diz que ainda
        // sobraram; sem eles, cai no otimista (só remove o que tentei).
        setOffer((cur) => {
          const rest =
            res.slots ??
            (('slots' in cur && cur.slots) || []).filter((s) => s.startsAtIso !== selectedIso);
          return {
            state: 'taken',
            serviceName: 'serviceName' in cur ? cur.serviceName : '',
            dayLabel: 'dayLabel' in cur ? cur.dayLabel : '',
            professionalName: 'professionalName' in cur ? cur.professionalName : null,
            priceLabel: 'priceLabel' in cur ? cur.priceLabel : null,
            slots: rest,
          };
        });
        setSelectedIso('');
        return;
      }
      if ('state' in res && res.state === 'expired') {
        setOffer({ state: 'expired' });
        return;
      }
      // { error }: mostra inline e deixa o cliente escolher outro (não derruba a tela).
      setConfirmError('error' in res ? res.error : 'Não foi possível confirmar. Tente de novo.');
    });
  }

  // --- Sucesso (verde full-bleed "Fechado.") ---------------------------------
  if (success) {
    const withPro = success.professionalName ? ` com o ${success.professionalName}` : '';
    return (
      <SuccessScreen
        slug={slug}
        tenantName={tenantName}
        whenLabel={success.whenLabel}
        serviceName={success.serviceName}
        professionalWith={withPro}
        priceLabel={success.priceLabel}
      />
    );
  }

  // --- Link expirado ---------------------------------------------------------
  if (offer.state === 'expired') {
    return (
      <Shell tenantName={tenantName}>
        <EdgeCard
          tone="neutral"
          title={{ pre: 'Esse link ', em: 'expirou', post: '' }}
          body="A vaga que a gente tinha segurado não está mais valendo. Mas relaxa - se abrir outra, te avisamos de novo no WhatsApp."
        />
        <BackToProfile slug={slug} />
      </Shell>
    );
  }

  // --- Timer expirou na contagem local: a vaga voltou pra fila (mantém a posição) ---
  if (timedOut) {
    return (
      <Shell tenantName={tenantName}>
        <EdgeCard
          tone="neutral"
          title={{ pre: 'O tempo ', em: 'acabou', post: '' }}
          body="Passou da janela pra confirmar essa vaga, então ela voltou pra fila. Você não perdeu seu lugar - se abrir de novo, a gente te chama no WhatsApp."
        />
        <BackToProfile slug={slug} />
      </Shell>
    );
  }

  // --- Ativo ou "alguém pegou antes" (ambos escolhem entre horários livres) ---
  const taken = offer.state === 'taken';
  const slots: QueueSlot[] = offer.slots;
  const dayLabel = offer.dayLabel;
  const withPro = offer.professionalName ? ` com o ${offer.professionalName}` : '';
  // Serviço + preço do que está sendo confirmado (só no estado ativo).
  const serviceName = offer.state === 'active' ? offer.serviceName : null;
  const priceLabel = 'priceLabel' in offer ? offer.priceLabel : null;

  // Sem horário sobrando após alguém pegar: vira mensagem de "voltou pra fila".
  if (taken && slots.length === 0) {
    return (
      <Shell tenantName={tenantName}>
        <EdgeCard
          tone="coral"
          title={{ pre: 'Foi mais ', em: 'rápido', post: '' }}
          body="Os horários que abriram já foram preenchidos. Você continua na fila - se abrir de novo, a gente te avisa no WhatsApp."
        />
        <BackToProfile slug={slug} />
      </Shell>
    );
  }

  return (
    <Shell tenantName={tenantName}>
      {taken ? (
        <div className="flex items-start gap-3.5 rounded-[18px] border border-[#f7cdb8] bg-[#fff4ec] p-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#ffe4d6]">
            <TriangleAlert className="text-coral h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-foreground font-serif text-[22px] leading-tight">
              Ihh, foi mais <span className="text-coral italic">rápido</span>
            </p>
            <p className="text-sub mt-1.5 text-[13.5px] leading-relaxed">
              Esse horário acabou de ser preenchido. Acontece - mas ainda tem{' '}
              <b className="text-foreground font-semibold">
                {slots.length} {slots.length === 1 ? 'horário livre' : 'horários livres'}
              </b>{' '}
              {dayLabel.toLowerCase()}
              {withPro}. Pega o seu antes que suma.
            </p>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-2">
            <span
              className="bg-green-bright h-1.5 w-1.5 animate-pulse rounded-full"
              aria-hidden="true"
            />
            <span className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#1b9a5b]">
              Vaga aberta · {dayLabel.toLowerCase()}
            </span>
          </div>
          <h1 className="text-foreground mt-2.5 font-serif text-[28px] font-medium leading-tight">
            {offer.professionalName ? `O ${offer.professionalName} abriu` : 'Abriu'}{' '}
            <span className="text-green-deep italic">
              {slots.length} {slots.length === 1 ? 'horário' : 'horários'}
            </span>
            . Escolhe o seu.
          </h1>
          {serviceName || priceLabel ? (
            <p className="text-sub mt-2 text-[13px]">
              {serviceName}
              {serviceName && priceLabel ? ' · ' : ''}
              {priceLabel}
            </p>
          ) : null}

          {/* Timer */}
          <div
            className={cn(
              'mt-4.5 flex items-center gap-3.5 rounded-[16px] border p-4',
              secondsLeft < 120 ? 'border-[#f7cdb8] bg-[#fff4ec]' : 'border-[#bfe0cb] bg-[#eaf6ee]',
            )}
          >
            <span
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[2.5px]',
                secondsLeft < 120 ? 'border-coral animate-pulse' : 'border-[#1b9a5b]',
              )}
            >
              <Clock
                className={cn('h-5 w-5', secondsLeft < 120 ? 'text-coral' : 'text-[#1b9a5b]')}
                aria-hidden="true"
              />
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  'text-[12.5px]',
                  secondsLeft < 120 ? 'text-[#c26a4d]' : 'text-[#2c7a53]',
                )}
              >
                Segurei essa vaga pra você por
              </p>
              <p
                className={cn(
                  'font-serif text-[25px] font-semibold tabular-nums',
                  secondsLeft < 120 ? 'text-coral' : 'text-[#1b9a5b]',
                )}
              >
                {mmss(secondsLeft)}
              </p>
            </div>
            <p
              className={cn(
                'max-w-[110px] text-right text-[11.5px] leading-snug',
                secondsLeft < 120 ? 'text-[#c26a4d]' : 'text-[#2c7a53]',
              )}
            >
              depois disso, volta pra fila
            </p>
          </div>
        </div>
      )}

      {/* Horários livres */}
      <div className="mt-5.5">
        <p className="text-foreground text-[13.5px] font-semibold">
          {taken ? 'Ainda tá livre' : 'Horários livres'}
          {withPro}
        </p>
        <div className="mt-3 flex flex-wrap gap-2.5" role="group" aria-label="Horários livres">
          {slots.map((s) => {
            const sel = s.startsAtIso === selectedIso;
            return (
              <button
                key={s.startsAtIso}
                type="button"
                onClick={() => setSelectedIso(s.startsAtIso)}
                aria-pressed={sel}
                className={cn(
                  'min-w-[96px] rounded-[14px] border px-[18px] py-3.5 text-center font-serif text-base font-bold transition-[transform,background-color,border-color]',
                  sel
                    ? 'bg-coral border-coral text-white'
                    : 'bg-card text-foreground border-edge hover:border-green-deep active:scale-95',
                )}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {confirmError ? (
        <p
          role="alert"
          className="border-destructive/40 bg-destructive/5 text-destructive mt-4 rounded-lg border p-3 text-sm"
        >
          {confirmError}
        </p>
      ) : null}

      <button
        type="button"
        onClick={handleConfirm}
        disabled={!selectedIso || confirming}
        aria-busy={confirming}
        className={cn(
          'mt-6 flex w-full items-center justify-center gap-2.5 rounded-[15px] py-4 text-[15px] font-bold text-white transition-transform',
          !selectedIso
            ? 'bg-coral/45'
            : confirming
              ? 'bg-coral/80'
              : 'bg-coral active:scale-[0.99]',
        )}
      >
        {confirming ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : null}
        {confirming
          ? 'Confirmando…'
          : selectedIso
            ? `Confirmar ${slots.find((s) => s.startsAtIso === selectedIso)?.label ?? ''}`
            : 'Escolhe um horário'}
      </button>
      <p className="text-sub mt-3 text-center text-[12px]">É só confirmar - o horário é seu.</p>
    </Shell>
  );
}

// ---------------------------------------------------------------------------

/** Casca da página (cream + card branco centrado + identidade discreta do negócio). */
function Shell({ tenantName, children }: { tenantName: string; children: React.ReactNode }) {
  return (
    <main className="bg-cream flex min-h-dvh flex-col items-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="bg-green-deep text-cream flex h-9 w-9 items-center justify-center rounded-[12px] font-serif text-base font-semibold">
            {tenantName.charAt(0)}
          </span>
          <span className="text-foreground truncate font-serif text-[15px] font-semibold">
            {tenantName}
          </span>
        </div>
        <div className="bg-paper border-line rounded-[22px] border p-6 shadow-[0_20px_50px_-30px_rgba(10,51,36,0.4)]">
          {children}
        </div>
      </div>
    </main>
  );
}

function EdgeCard({
  tone,
  title,
  body,
}: {
  tone: 'coral' | 'neutral';
  title: { pre: string; em: string; post: string };
  body: string;
}) {
  const coral = tone === 'coral';
  return (
    <div className="flex items-start gap-3.5">
      <span
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]',
          coral ? 'bg-[#ffeee9]' : 'bg-[#f2ecdd]',
        )}
      >
        <TriangleAlert
          className={cn('h-5 w-5', coral ? 'text-coral' : 'text-[#8a7b57]')}
          aria-hidden="true"
        />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-foreground font-serif text-[22px] leading-tight">
          {title.pre}
          <span className={cn('italic', coral ? 'text-coral' : 'text-green-deep')}>{title.em}</span>
          {title.post}
        </p>
        <p className="text-sub mt-2 text-[13.5px] leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

function BackToProfile({ slug }: { slug: string }) {
  return (
    <Link
      href={`/${slug}`}
      className="text-sub hover:border-green-deep hover:text-green-deep mt-6 flex items-center justify-center gap-2 rounded-[13px] border border-dashed border-[#c9bd9f] py-3.5 text-[13px] font-semibold transition-colors"
    >
      Ver a agenda de outro dia
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}

function SuccessScreen({
  slug,
  tenantName,
  whenLabel,
  serviceName,
  professionalWith,
  priceLabel,
}: {
  slug: string;
  tenantName: string;
  whenLabel: string;
  serviceName: string;
  professionalWith: string;
  priceLabel: string | null;
}) {
  return (
    <main className="bg-green-deep relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-12">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(560px 340px at 82% 4%, rgba(47,211,122,0.20), transparent), radial-gradient(500px 340px at 10% 96%, rgba(255,90,54,0.13), transparent)',
        }}
        aria-hidden="true"
      />
      <div className="animate-rise relative w-full max-w-sm text-center">
        <div className="flex justify-center">
          <span className="bg-green-bright flex h-[82px] w-[82px] items-center justify-center rounded-[26px] shadow-[0_20px_44px_-14px_rgba(47,211,122,0.6)]">
            <Check className="text-green-deep h-10 w-10" strokeWidth={3} aria-hidden="true" />
          </span>
        </div>
        <h1 className="text-cream mt-6 font-serif text-[40px] font-medium leading-none">
          Fech<span className="text-green-bright italic">ado.</span>
        </h1>
        <p className="mx-auto mt-3 max-w-[340px] text-[15px] leading-relaxed text-[#8fbfa4]">
          {whenLabel}
          {professionalWith}. Chega uns 10 minutinhos antes.
        </p>

        <div className="mt-6 rounded-[22px] border border-[rgba(47,211,122,0.32)] bg-[#083020] p-5 text-left shadow-[0_26px_50px_-22px_rgba(4,20,13,0.75)]">
          <div className="flex items-center gap-3.5">
            <span className="bg-green-deep text-cream flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] font-serif text-xl font-semibold">
              {tenantName.charAt(0)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-paper truncate font-serif text-base font-semibold">{tenantName}</p>
              <p className="mt-0.5 truncate text-[12.5px] font-medium text-[#8fbfa4]">
                {serviceName}
                {professionalWith}
              </p>
            </div>
          </div>
          <div className="my-3.5 border-t border-dashed border-[rgba(143,191,164,0.4)]" />
          <div className="flex items-baseline gap-3">
            <p className="text-cream flex-1 font-serif text-lg font-semibold capitalize">
              {whenLabel}
            </p>
            {priceLabel ? (
              <p className="text-green-bright font-serif text-lg font-semibold">{priceLabel}</p>
            ) : null}
          </div>
        </div>

        {/* Convite mais forte pro app (copy only; sem links de store até o app publicar). */}
        <div className="mt-4 flex items-center gap-3.5 rounded-[20px] border border-[rgba(143,191,164,0.28)] bg-[rgba(255,253,248,0.05)] p-5 text-left">
          <BellRing className="text-green-bright h-6 w-6 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-cream font-serif text-[18px] leading-tight">
              Baixa o <span className="text-green-bright italic">app</span> e relaxa
            </p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-[#8fbfa4]">
              Acompanhe seus horários e receba os avisos de vaga na hora - sem depender do WhatsApp.
            </p>
          </div>
        </div>

        <Link
          href={`/${slug}`}
          className="text-cream mt-5 inline-block rounded-[13px] border border-[rgba(250,245,234,0.26)] px-7 py-3 text-[13.5px] font-bold transition-colors hover:bg-[rgba(250,245,234,0.08)]"
        >
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}
