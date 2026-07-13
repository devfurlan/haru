'use client';

// Front da fila de espera no fluxo de agendamento (passo dia/horário da página pública).
// Aparece SÓ no estado "sem horário livre"; a engine e as regras vivem em ./queue-actions
// (adapter real da engine em @/lib/waitlist). Visual espelha o resto do booking: paper/cream,
// coral, Fraunces.

import {
  ArrowRight,
  BellRing,
  Loader2,
  LogOut,
  Moon,
  Smartphone,
  User as UserIcon,
} from 'lucide-react';
import Link from 'next/link';

import { CustomerSignupForm } from '@/app/(customer)/conta/(public)/criar/signup-form';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

import type { QueueEligibility } from './queue-actions';

export interface QueueBookingContext {
  eligibility: QueueEligibility | null; // null = carregando
  /** Nome do profissional escolhido, ou null ("qualquer"/desconhecido). */
  professionalName: string | null;
  /** Dia por extenso capitalizado ("Sábado") pro texto dos cards. */
  weekday: string;
  joining: boolean;
  leaving: boolean;
  onJoin: () => void;
  onLeave: () => void;
  /** Rola o carrossel de dias de volta à vista (botão "Ver outros dias"). */
  onSeeOtherDays: () => void;
}

/** Card que substitui "Nenhum horário livre" quando dá pra entrar na fila (ou não). */
export function QueueEmptyCard({ ctx }: { ctx: QueueBookingContext }) {
  const {
    eligibility,
    professionalName,
    weekday,
    joining,
    leaving,
    onJoin,
    onLeave,
    onSeeOtherDays,
  } = ctx;
  const withPro = professionalName ? ` com o ${professionalName}` : '';

  // Carregando a elegibilidade: placeholder neutro (mesmo box do "sem horário").
  if (!eligibility) {
    return (
      <div className="bg-muted text-sub flex items-center gap-2 rounded-lg border p-4 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Nenhum horário livre nesse dia.
      </div>
    );
  }

  // Fila indisponível pra este dia/profissional: cai no texto simples de sempre.
  if (eligibility.state === 'unavailable') {
    return (
      <p className="bg-muted text-sub rounded-lg border p-4 text-sm">
        Nenhum horário livre nesse dia.
      </p>
    );
  }

  // Já está na fila desse dia+profissional: posição + sair da fila.
  if (eligibility.state === 'open' && eligibility.alreadyInQueue) {
    return (
      <div className="border-green/25 bg-green/5 space-y-3 rounded-[20px] border p-5">
        <div className="flex items-start gap-3.5">
          <span className="bg-green/15 flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]">
            <BellRing className="text-green h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-foreground font-serif text-[20px] leading-tight">
              Você já tá na fila de{' '}
              <span className="text-green italic">{weekday.toLowerCase()}</span>
            </p>
            <p className="text-sub mt-1.5 text-[13.5px] leading-relaxed">
              Você é o{' '}
              <b className="text-foreground font-serif text-[15px]">{eligibility.position}º</b> da
              fila
              {withPro}. Assim que abrir vaga, te aviso no seu WhatsApp.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onLeave}
          disabled={leaving}
          className="text-sub hover:text-destructive mx-auto flex items-center gap-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
        >
          {leaving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <LogOut className="h-3.5 w-3.5" />
          )}
          Sair da fila
        </button>
      </div>
    );
  }

  // Dia lotado, expediente rolando: oferece "me avisa se abrir" (o único CTA de fila).
  if (eligibility.state === 'open') {
    return (
      <div className="bg-card space-y-4 rounded-[20px] border border-[#f0d9cf] p-[22px]">
        <div className="flex items-start gap-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#ffeee9]">
            <BellRing className="text-coral h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-foreground font-serif text-[21px] leading-tight">
              {weekday} tá <span className="text-coral italic">cheio</span>
              {withPro}
            </p>
            <p className="text-sub mt-1.5 text-[13.5px] leading-relaxed">
              Mas o expediente ainda tá rolando. Te aviso no seu WhatsApp assim que abrir vaga.
            </p>
          </div>
        </div>
        <div>
          <Button
            type="button"
            variant="coral"
            onClick={onJoin}
            disabled={joining}
            aria-busy={joining}
            className="h-[52px] w-full rounded-[14px] text-[15px] font-bold"
          >
            {joining ? (
              <Loader2 className="h-[18px] w-[18px] animate-spin" />
            ) : (
              <BellRing className="h-[18px] w-[18px]" />
            )}
            Me avisa se abrir
          </Button>
          <p className="text-sub mt-2.5 text-center text-[11.5px]">
            A gente te avisa no seu WhatsApp - num toque, sem preencher nada.
          </p>
        </div>
      </div>
    );
  }

  // Expediente do dia encerrado (ou profissional não atende): sem CTA, manda escolher outro dia.
  return (
    <div className="bg-card space-y-4 rounded-[20px] border border-[#ece3cf] p-[22px]">
      <div className="flex items-start gap-3.5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#f2ecdd]">
          <Moon className="h-5 w-5 text-[#8a7b57]" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-foreground font-serif text-[21px] leading-tight">
            {weekday} já <span className="text-green-deep italic">fechou</span> por aqui
          </p>
          <p className="text-sub mt-1.5 text-[13.5px] leading-relaxed">
            O expediente terminou. Dá uma olhada em outro dia que ainda dá tempo.
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={onSeeOtherDays}
        className="h-[52px] w-full rounded-[14px] text-[14px] font-bold"
      >
        Ver outros dias
      </Button>
    </div>
  );
}

/** Convite leve pro app (a fila web avisa por WhatsApp; com app, chega na hora). */
function AppNudge() {
  return (
    <div className="bg-card mx-auto flex max-w-[380px] items-center gap-3 rounded-[16px] border border-dashed border-[#d9cfb6] p-3.5 text-left">
      <Smartphone className="text-sub h-5 w-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-foreground text-[12.5px] font-semibold">
          Tem o app? Aí o aviso chega na hora.
        </p>
        {/* TODO(app): link real das stores quando o app publicar. */}
        <p className="text-sub text-[11.5px]">Sem depender do WhatsApp.</p>
      </div>
    </div>
  );
}

/** Tela "fila confirmada" - depois de entrar na fila, dentro do modal do booking. */
export function QueueJoinedScreen({
  firstName,
  weekday,
  professionalName,
  position,
  leaving,
  onLeave,
  error,
}: {
  firstName: string;
  weekday: string;
  professionalName: string | null;
  position: number;
  leaving: boolean;
  onLeave: () => void;
  /** Erro ao tentar sair da fila (a tela não navega; mostra inline). */
  error?: string | null;
}) {
  const withPro = professionalName ? ` com o ${professionalName}` : '';
  const name = firstName.trim();
  return (
    <div className="space-y-6 py-2 text-center">
      <div>
        <div className="border-green/25 bg-green/10 mx-auto flex h-[74px] w-[74px] items-center justify-center rounded-[24px] border">
          <BellRing className="text-green h-9 w-9" strokeWidth={2.4} aria-hidden="true" />
        </div>
        <h2 className="text-foreground mt-5 font-serif text-[30px] font-medium leading-tight">
          {name ? (
            <>
              Pronto, <span className="text-green-deep italic">{name}</span>.
            </>
          ) : (
            <>
              <span className="text-green-deep italic">Pronto!</span>
            </>
          )}
        </h2>
        <p className="text-sub mx-auto mt-2.5 max-w-[360px] text-[15px] leading-relaxed">
          Se abrir horário{' '}
          <b className="text-foreground font-semibold">
            {weekday.toLowerCase()}
            {withPro}
          </b>
          , a gente te avisa no seu WhatsApp na hora. Pode seguir sua vida - eu te chamo.
        </p>
      </div>

      <div className="bg-card px-4.5 inline-flex items-center gap-2.5 rounded-full border border-[#f0e8d4] py-2.5">
        <span className="text-sub text-[13px]">
          Você é o <b className="text-green-deep font-serif text-[15px]">{position}º</b> na fila de{' '}
          {weekday.toLowerCase()}
        </span>
      </div>

      <AppNudge />

      <div className="space-y-2">
        {error ? (
          <p
            role="alert"
            className="border-destructive/40 bg-destructive/5 text-destructive mx-auto max-w-[360px] rounded-lg border p-2.5 text-xs"
          >
            {error}
          </p>
        ) : null}
        <button
          type="button"
          onClick={onLeave}
          disabled={leaving}
          className="text-sub hover:text-destructive mx-auto flex items-center gap-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
        >
          {leaving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <LogOut className="h-3.5 w-3.5" />
          )}
          Sair da fila
        </button>
      </div>
    </div>
  );
}

/** Gate de conta: entrar na fila exige login/cadastro. Cadastro inline não perde o
 *  contexto; "Entrar" leva ao login e volta pra fila pela URL `next`. */
export function QueueGateDialog({
  open,
  onOpenChange,
  loginHref,
  onAuthenticated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  loginHref: string;
  onAuthenticated: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dismissable={false} className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl font-semibold">
            Entre pra entrar na fila
          </DialogTitle>
        </DialogHeader>
        <p className="text-sub -mt-2 text-sm">
          Pra guardar seu lugar na fila e te avisar quando abrir vaga, você precisa de conta. É
          rapidinho - e você não perde o dia que escolheu.
        </p>
        <CustomerSignupForm inline onSuccess={onAuthenticated} />
        <p className="text-sub text-center text-[11px]">
          Já tem conta?{' '}
          <Link
            href={loginHref}
            className={cn('text-coral font-semibold underline underline-offset-2')}
          >
            <UserIcon className="mr-0.5 inline h-3 w-3" />
            Entrar
          </Link>
        </p>
        <p className="text-sub flex items-center justify-center gap-1 text-center text-[11px]">
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
          Depois de entrar, você volta direto pra fila.
        </p>
      </DialogContent>
    </Dialog>
  );
}
