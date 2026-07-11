'use client';

import { useState, useTransition } from 'react';
import { Gift } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { LoyaltyOverview } from '@/lib/loyalty';

import { LoyaltyForm, type ServiceOption } from './loyalty-form';
import { endLoyaltyProgram, redeemLoyaltyPrize, toggleLoyaltyPause } from './actions';

interface LoyaltyPanelProps {
  overview: LoyaltyOverview | null;
  services: ServiceOption[];
}

export function LoyaltyPanel({ overview, services }: LoyaltyPanelProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="mx-auto flex w-full max-w-[920px] flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-[220px] flex-1">
          <h1 className="text-ink font-serif text-[28px] tracking-tight">Fidelidade</h1>
          <p className="text-ink-50 mt-1 text-sm">Cliente que volta sempre merece prêmio.</p>
        </div>
        {overview && (
          <Button variant="outline" onClick={() => setModalOpen(true)}>
            Editar programa
          </Button>
        )}
      </div>

      {overview ? (
        <ActiveProgram
          overview={overview}
          pending={pending}
          onPause={() => startTransition(() => toggleLoyaltyPause())}
          onRedeem={(contactId) => startTransition(() => redeemLoyaltyPrize(contactId))}
          onEnd={() => setConfirmEnd(true)}
        />
      ) : (
        <EmptyState onCreate={() => setModalOpen(true)} />
      )}

      {/* modal criar/editar */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent dismissable={false} className="max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="font-serif text-[22px]">
              {overview ? 'Editar' : 'Criar'} programa de{' '}
              <em className="text-green-emph italic">fidelidade</em>
            </DialogTitle>
            <p className="text-ink-50 text-[13px]">
              Define a regra - o carimbo acontece sozinho a cada agendamento concluído.
            </p>
          </DialogHeader>
          <LoyaltyForm
            program={overview?.program}
            services={services}
            onSuccess={() => setModalOpen(false)}
            onCancel={() => setModalOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* confirmar encerramento */}
      <Dialog open={confirmEnd} onOpenChange={setConfirmEnd}>
        <DialogContent className="max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="font-serif text-[20px]">Encerrar o programa?</DialogTitle>
            <p className="text-ink-70 text-[13px]">
              Os cartões dos clientes somem e o histórico de resgates é apagado. Não dá pra
              desfazer.
            </p>
          </DialogHeader>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setConfirmEnd(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await endLoyaltyProgram();
                  setConfirmEnd(false);
                })
              }
            >
              Encerrar programa
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="border-edge bg-paper rounded-[22px] border border-dashed px-6 py-10 text-center">
      <div className="bg-chip text-green-emph mx-auto mb-3.5 flex size-14 items-center justify-center rounded-2xl">
        <Gift className="size-6" />
      </div>
      <div className="text-ink font-serif text-[24px] tracking-tight">
        Quem volta sempre, <em className="text-green-emph italic">ganha</em>
      </div>
      <p className="text-ink-70 mx-auto mt-2.5 max-w-[420px] text-[13px] leading-relaxed">
        Um cartão fidelidade digital, direto no app do cliente. Você define a regra uma vez - o
        resto é automático.
      </p>
      <div className="mx-auto mt-4 flex max-w-[400px] flex-col gap-2.5 text-left">
        {[
          'Cliente conclui um agendamento e ganha carimbo sozinho',
          'Completou o cartão e o prêmio é liberado no app dele',
          'Você só confirma o resgate na cadeira',
        ].map((tx, i) => (
          <div key={i} className="text-ink-70 flex gap-2.5 text-[13px] leading-snug">
            <span className="bg-chip text-green-emph flex size-5 flex-none items-center justify-center rounded-full text-[11px] font-bold">
              {i + 1}
            </span>
            {tx}
          </div>
        ))}
      </div>
      <Button variant="coral" className="mt-5" onClick={onCreate}>
        Criar programa
      </Button>
    </div>
  );
}

function ActiveProgram({
  overview,
  pending,
  onPause,
  onRedeem,
  onEnd,
}: {
  overview: LoyaltyOverview;
  pending: boolean;
  onPause: () => void;
  onRedeem: (contactId: string) => void;
  onEnd: () => void;
}) {
  const { program, stats, rows, ruleLabel, countLabel, validityLabel, monthLabel } = overview;
  const paused = program.paused;

  return (
    <>
      {/* estatísticas */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        <Stat label="Participando" value={`${stats.participating}`} suffix="clientes" />
        <Stat label={`Carimbos em ${monthLabel}`} value={`${stats.stampsThisMonth}`} />
        <Stat label="Prêmios resgatados" value={`${stats.redeemed}`} accent />
      </div>

      {/* a regra do jogo */}
      <div className="bg-green-deep text-on-emerald relative overflow-hidden rounded-[20px] px-5 py-5">
        <div className="relative flex flex-wrap items-start gap-3.5">
          <div className="min-w-[220px] flex-1">
            <div className="text-on-emerald-mut text-[10.5px] font-bold uppercase tracking-[0.14em]">
              A regra do jogo
            </div>
            <div className="mt-1.5 font-serif text-[24px] tracking-tight">{ruleLabel}</div>
            <div className="text-on-emerald-mut mt-2 text-[12.5px]">
              {countLabel} · {validityLabel}
            </div>
          </div>
          <span
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1.5 text-[10.5px] font-semibold"
            style={
              paused
                ? { background: 'rgba(255,90,54,.18)', color: '#ffb3a0' }
                : { background: 'rgba(47,211,122,.16)', color: '#7fe0aa' }
            }
          >
            <span
              className="size-1.5 rounded-full"
              style={{ background: paused ? '#ff8a6e' : '#2FD37A' }}
            />
            {paused ? 'Pausado' : 'Ativo'}
          </span>
        </div>
        <div className="relative mt-4 flex gap-2.5">
          <button
            type="button"
            disabled={pending}
            onClick={onPause}
            className="border-on-emerald/30 text-on-emerald hover:bg-on-emerald/10 whitespace-nowrap rounded-full border px-4 py-2.5 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {paused ? 'Retomar' : 'Pausar'}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onEnd}
            className="text-on-emerald-mut whitespace-nowrap rounded-full px-3 py-2.5 text-xs font-semibold transition-colors hover:text-[#ffb3a0] disabled:opacity-50"
          >
            Encerrar programa
          </button>
        </div>
      </div>

      {/* perto do prêmio */}
      <div className="border-line bg-paper shadow-soft rounded-[20px] border px-5 py-4">
        <div className="text-ink font-serif text-base">Perto do prêmio</div>
        <p className="text-ink-50 mt-0.5 text-xs">
          Bom saber quem tá quase lá - um &quot;falta 1!&quot; no balcão faz milagre.
        </p>
        {rows.length === 0 ? (
          <p className="text-ink-50 py-6 text-center text-[13px]">
            Ninguém com carimbo ainda. Assim que os clientes voltarem, eles aparecem aqui.
          </p>
        ) : (
          <div className="mt-2 flex flex-col">
            {rows.map((c) => {
              const pct = Math.min(100, Math.round((c.stamps / c.required) * 100));
              return (
                <div
                  key={c.contactId}
                  className="border-edge flex items-center gap-3.5 border-t border-dotted py-3.5 first:border-t-0"
                >
                  <div className="bg-green-deep text-on-emerald flex size-9 flex-none items-center justify-center rounded-xl text-[12px] font-bold">
                    {c.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-ink text-sm font-semibold">{c.name}</span>
                      {c.won && (
                        <span className="bg-coral-tint text-coral-deep whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-semibold">
                          Prêmio liberado
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2.5">
                      <div className="bg-cream-2 h-1.5 max-w-[180px] flex-1 overflow-hidden rounded-full">
                        <div
                          className="h-full rounded-full transition-[width] duration-500"
                          style={{
                            width: `${pct}%`,
                            background: c.won ? 'var(--coral)' : 'var(--brand-green-bright)',
                          }}
                        />
                      </div>
                      <span className="text-ink-50 whitespace-nowrap text-xs font-semibold">
                        {Math.min(c.stamps, c.required)}/{c.required}
                      </span>
                    </div>
                  </div>
                  {c.won ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => onRedeem(c.contactId)}
                      className="bg-coral flex-none whitespace-nowrap rounded-full px-3.5 py-2.5 text-xs font-semibold text-white transition-transform active:scale-95 disabled:opacity-50"
                    >
                      Confirmar resgate
                    </button>
                  ) : (
                    <span className="text-ink-30 flex-none whitespace-nowrap text-xs font-semibold">
                      faltam {c.required - c.stamps}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  suffix,
  accent,
}: {
  label: string;
  value: string;
  suffix?: string;
  accent?: boolean;
}) {
  return (
    <div className="border-line bg-paper rounded-2xl border px-4 py-3.5">
      <div className="text-ink-50 text-[11px] font-semibold uppercase tracking-[0.1em]">
        {label}
      </div>
      <div className={`mt-1.5 font-serif text-[26px] ${accent ? 'text-green-emph' : 'text-ink'}`}>
        {value}
        {suffix && <span className="text-ink-50 ml-1 text-xs">{suffix}</span>}
      </div>
    </div>
  );
}
