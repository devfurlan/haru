'use client';

// Aba "Fila de espera" da Agenda (painel do dono). SÓ MOSTRA - a fila roda sozinha.
// O dono vê quem espera (por dia + profissional), a oportunidade do momento (insight),
// o que está acontecendo ao vivo e quanto já recuperou. A única ação é "Encaixar"
// alguém manualmente (abrir horário extra e chamar direto).

import { Check, ChevronRight, Clock, Info, Lightbulb, Plus, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type {
  ActiveOfferLive,
  RecoveryMetric,
  WaitlistGroup,
  WaitlistInsight,
  WaitlistPerson,
} from '@/lib/waitlist-panel';

import { encaixeFromWaitlist } from './waitlist-actions';

export interface WaitlistViewProps {
  enabled: boolean;
  metric: RecoveryMetric;
  insight: WaitlistInsight;
  live: ActiveOfferLive;
  groups: WaitlistGroup[];
  totalWaiting: number;
  /** R$ recuperado + insight de receita: só o dono. Apoio gere a fila sem ver dinheiro. */
  showRecovery?: boolean;
}

export function WaitlistView({
  enabled,
  metric,
  insight,
  live,
  groups,
  totalWaiting,
  showRecovery = true,
}: WaitlistViewProps) {
  const [encaixe, setEncaixe] = useState<{ person: WaitlistPerson; group: WaitlistGroup } | null>(
    null,
  );

  if (!enabled) return <OffCard />;

  const nothingYet = groups.length === 0 && (!showRecovery || metric.count === 0);
  if (nothingYet) return <EmptyState />;

  return (
    <div className="flex flex-col gap-4">
      {showRecovery && metric.count > 0 && <RecoveryCard metric={metric} />}
      {showRecovery && insight && <InsightCard insight={insight} />}
      {live && <LiveCard live={live} />}

      {groups.length > 0 ? (
        <>
          <div className="mt-0.5 flex items-baseline gap-2.5">
            <h2 className="text-ink font-serif text-lg">Quem está esperando</h2>
            <span className="text-ink-50 text-[12.5px] font-medium">
              {totalWaiting} na fila · por dia e profissional
            </span>
          </div>
          {groups.map((g) => (
            <GroupCard
              key={g.key}
              group={g}
              onEncaixe={(p) => setEncaixe({ person: p, group: g })}
            />
          ))}
        </>
      ) : (
        <div className="border-edge text-ink-50 rounded-2xl border border-dashed px-5 py-6 text-center text-[13px]">
          Ninguém na fila agora. Quando um dia lotar, seus clientes entram aqui sozinhos.
        </div>
      )}

      {encaixe && (
        <EncaixeDialog
          person={encaixe.person}
          group={encaixe.group}
          onClose={() => setEncaixe(null)}
        />
      )}
    </div>
  );
}

// ── Métrica de recuperação ────────────────────────────────────────────────────

function RecoveryCard({ metric }: { metric: RecoveryMetric }) {
  return (
    <div className="border-line shadow-soft flex flex-wrap items-center gap-4 rounded-[18px] border p-5 [background:radial-gradient(460px_200px_at_8%_-40%,rgba(47,211,122,.16),transparent_62%),var(--brand-paper)]">
      <div className="bg-chip text-green-emph size-11.5 flex flex-none items-center justify-center rounded-[14px]">
        <Clock className="size-6" strokeWidth={2.1} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-green-emph text-[10.5px] font-bold uppercase tracking-[0.13em]">
          Recuperado este mês
        </div>
        <div className="mt-0.5 flex flex-wrap items-baseline gap-3">
          <span className="text-ink font-serif text-3xl">{metric.label}</span>
          <span className="text-ink-50 text-[12.5px] font-medium">{metric.countLabel}</span>
        </div>
      </div>
      {metric.deltaLabel && (
        <span
          className={`bg-chip inline-flex flex-none items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1.5 text-[11.5px] font-bold ${
            (metric.deltaPct ?? 0) >= 0 ? 'text-green-emph' : 'text-coral-deep'
          }`}
        >
          {metric.deltaLabel} vs. mês passado
        </span>
      )}
    </div>
  );
}

// ── Insight (a oportunidade) ──────────────────────────────────────────────────

function InsightCard({ insight }: { insight: NonNullable<WaitlistInsight> }) {
  const art = insight.professionalName ? 'o' : '';
  return (
    <div className="text-on-emerald relative overflow-hidden rounded-[20px] p-6 shadow-[0_16px_36px_rgba(10,51,36,.28)] [background:radial-gradient(520px_260px_at_88%_-30%,rgba(255,90,54,.20),transparent_60%),radial-gradient(480px_300px_at_6%_130%,rgba(47,211,122,.16),transparent_60%),var(--emerald)]">
      <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#ffb59f]">
        <Lightbulb className="size-[15px]" strokeWidth={2.2} />
        Oportunidade
      </div>
      <p className="mt-2.5 max-w-[640px] font-serif text-[25px] leading-[1.18]">
        {insight.count} pessoas querem{' '}
        <em className="text-green-bright italic">{insight.dayLabel}</em>{' '}
        {insight.professionalName ? `com ${art} ${insight.professionalName}` : 'com você'}.
      </p>
      <p className="text-on-emerald-mut mt-1 max-w-[560px] text-sm leading-relaxed">
        Abrir mais{' '}
        <strong className="text-on-emerald font-semibold">
          {insight.suggestSlots} {insight.suggestSlots === 1 ? 'horário' : 'horários'}
        </strong>{' '}
        nesse dia pode render{' '}
        <strong className="text-on-emerald font-semibold">~{insight.estimatedLabel}</strong> - e a
        fila é avisada na hora, sozinha.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3.5">
        <Button asChild variant="coral">
          <Link
            href={`/schedule?professional=${insight.professionalId}`}
            className="inline-flex items-center gap-2"
          >
            <Plus className="size-4" strokeWidth={2.3} />
            Abrir horário extra
          </Link>
        </Button>
      </div>
    </div>
  );
}

// ── Ao vivo (vaga aberta, avisando) ───────────────────────────────────────────

function LiveCard({ live }: { live: NonNullable<ActiveOfferLive> }) {
  return (
    <div className="bg-paper shadow-soft rounded-[18px] border border-[#ffd6c9] p-5">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="text-coral-deep flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.13em]">
          <span className="bg-coral animate-pulse-ring size-2 rounded-full" />
          Acontecendo agora
        </div>
        <div className="text-ink-50 ml-auto text-[11.5px] font-medium">
          próxima onda em {live.nextWaveInMin} min
        </div>
      </div>
      <p className="text-ink mt-2 font-serif text-lg">
        Vaga aberta <em className="text-coral-deep italic">{live.dayLabel}</em>{' '}
        {live.professionalName ? `com ${live.professionalName}` : ''}
      </p>
      <p className="text-ink-50 mt-0.5 text-[12.5px]">
        Avisando a fila em ondas. Quem confirmar primeiro fica com a vaga.
      </p>
      <div className="mt-3.5">
        <div className="mb-1.5 flex justify-between text-[11.5px] font-semibold">
          <span className="text-ink-70">
            {live.notified} de {live.total} avisados
          </span>
          <span className="text-ink-50">aguardando confirmação</span>
        </div>
        <div className="bg-line h-[7px] overflow-hidden rounded">
          {/* ponytail: runtime, Tailwind nao gera */}
          <div className="bg-coral h-full rounded" style={{ width: `${live.progressPct}%` }} />
        </div>
      </div>
    </div>
  );
}

// ── Grupo (dia + profissional) colapsável ─────────────────────────────────────

function GroupCard({
  group,
  onEncaixe,
}: {
  group: WaitlistGroup;
  onEncaixe: (person: WaitlistPerson) => void;
}) {
  const [open, setOpen] = useState(group.hasActiveOffer);
  const initials = (group.professionalName ?? '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');

  return (
    <div className="border-line bg-paper shadow-soft overflow-hidden rounded-[18px] border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="hover:bg-cream-2/40 flex w-full items-center gap-3 p-4 text-left"
      >
        <div className="bg-chip text-green-emph size-9.5 flex flex-none items-center justify-center rounded-[11px] font-serif text-[12.5px] font-semibold">
          {initials || <Users className="size-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-ink whitespace-nowrap font-serif text-[15.5px]">
              {group.dayLabel}
            </span>
            {group.professionalName && (
              <span className="text-ink-70 text-[12px] font-semibold">
                · {group.professionalName}
              </span>
            )}
            {group.hasActiveOffer && (
              <span className="bg-coral-tint text-coral-deep inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[9.5px] font-bold uppercase tracking-wide">
                <span className="bg-coral animate-pulse-ring size-1.5 rounded-full" />
                vaga aberta
              </span>
            )}
          </div>
          <div className="text-ink-50 mt-0.5 text-[11.5px] font-medium">
            dia lotado · {group.count} na fila
          </div>
        </div>
        <span className="bg-green-deep text-cream h-5.5 min-w-5.5 flex flex-none items-center justify-center rounded-full px-1.5 text-[12px] font-bold">
          {group.count}
        </span>
        <ChevronRight
          className={`text-ink-30 size-4.5 flex-none transition-transform ${open ? 'rotate-90' : ''}`}
        />
      </button>

      {open && (
        <div>
          {group.people.map((p) => (
            <div
              key={p.entryId}
              className="border-edge flex flex-wrap items-center gap-3 border-t border-dotted p-3 px-4"
            >
              <div className="bg-cream-2 text-ink-70 size-6.5 flex flex-none items-center justify-center rounded-full font-serif text-[12px] font-semibold">
                {p.position}
              </div>
              <div className="min-w-[130px] flex-1">
                <div className="text-ink whitespace-nowrap text-[13.5px] font-semibold">
                  {p.contactName}
                </div>
                <div className="text-ink-50 mt-0.5 text-[11.5px] font-medium">
                  {p.serviceName} ·{' '}
                  <span className="text-ink-70 font-semibold">{p.priceLabel}</span> · {p.sinceLabel}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onEncaixe(p)}
                className="border-edge bg-paper text-ink-70 hover:bg-cream-2 hover:text-ink flex-none whitespace-nowrap rounded-full border px-3 py-2 text-[11.5px] font-semibold"
              >
                Encaixar
              </button>
            </div>
          ))}
          <div className="border-edge text-ink-50 flex items-center gap-2 border-t border-dotted px-4 py-3 text-[11.5px]">
            <Info className="size-[15px] flex-none" strokeWidth={2} />
            Roda sozinho - se abrir vaga, a fila é avisada na hora. Use{' '}
            <strong className="text-ink-70 font-semibold">Encaixar</strong> só pra chamar alguém
            direto.
          </div>
        </div>
      )}
    </div>
  );
}

// ── Encaixe manual (abrir horário extra e chamar direto) ──────────────────────

function EncaixeDialog({
  person,
  group,
  onClose,
}: {
  person: WaitlistPerson;
  group: WaitlistGroup;
  onClose: () => void;
}) {
  const router = useRouter();
  const [time, setTime] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!/^\d{2}:\d{2}$/.test(time)) {
      setError('Escolha um horário (ex.: 15:30).');
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await encaixeFromWaitlist({ entryId: person.entryId, time });
      if ('error' in res) {
        setError(res.error);
        return;
      }
      router.refresh();
      onClose();
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent dismissable={false}>
        <DialogHeader>
          <DialogTitle>Encaixar {person.contactName}</DialogTitle>
          <DialogDescription>
            {group.dayLabel}
            {group.professionalName ? ` · ${group.professionalName}` : ''} · {person.serviceName} (
            {person.priceLabel})
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 space-y-3">
          <label className="block">
            <span className="text-ink-70 mb-1 block text-sm font-medium">Horário extra</span>
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full"
              autoFocus
            />
            <span className="text-ink-50 mt-1 block text-xs">
              Abre um horário fora da grade e já marca esse cliente. Ele sai da fila.
            </span>
          </label>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={onClose} disabled={pending}>
              Cancelar
            </Button>
            <Button variant="coral" onClick={submit} disabled={pending}>
              {pending ? 'Encaixando…' : 'Encaixar e marcar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Estados vazio / desligado ─────────────────────────────────────────────────

function EmptyState() {
  const steps = [
    {
      n: 1,
      t: 'O dia lota com um profissional',
      d: 'Aí o cliente vê a opção de entrar na fila daquele dia.',
    },
    { n: 2, t: 'Alguém cancela', d: 'A vaga abre e a fila daquele dia é avisada na hora.' },
    {
      n: 3,
      t: 'Preenche sozinho',
      d: 'Quem confirmar primeiro fica com o horário. Receita de volta.',
    },
  ];
  return (
    <div className="border-edge bg-paper shadow-soft rounded-[20px] border border-dashed px-7 py-9 text-center">
      <div className="bg-chip text-green-emph size-13.5 mx-auto mb-3.5 flex items-center justify-center rounded-[16px]">
        <Users className="size-6" strokeWidth={2} />
      </div>
      <div className="text-ink font-serif text-[22px]">
        Ninguém na fila <em className="text-green-emph italic">por enquanto</em>
      </div>
      <p className="text-ink-50 mx-auto mt-2 max-w-[420px] text-[13.5px] leading-relaxed">
        Quando sua agenda lotar, seus clientes vão poder entrar na fila. A gente avisa eles se abrir
        horário - você não precisa fazer nada.
      </p>
      <div className="mx-auto mt-5 flex max-w-[520px] flex-wrap justify-center gap-2.5 text-left">
        {steps.map((s) => (
          <div
            key={s.n}
            className="border-line min-w-[150px] flex-1 rounded-[14px] border bg-[#fbf7ec] px-3.5 py-3"
          >
            <div className="border-edge bg-paper text-green-emph size-6.5 mb-2 flex items-center justify-center rounded-lg border font-serif text-[12px] font-semibold">
              {s.n}
            </div>
            <div className="text-ink text-[12.5px] font-semibold">{s.t}</div>
            <div className="text-ink-50 mt-0.5 text-[11.5px] leading-snug">{s.d}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OffCard() {
  return (
    <div className="border-edge bg-paper shadow-soft rounded-[18px] border border-dashed px-6 py-8 text-center">
      <div className="text-ink-50 size-13 mx-auto mb-3 flex items-center justify-center rounded-[16px] bg-[#f3edde]">
        <Clock className="size-6" strokeWidth={2.1} />
      </div>
      <div className="text-ink font-serif text-xl">
        A fila de espera está <em className="text-coral-deep italic">desligada</em>
      </div>
      <p className="text-ink-50 mx-auto mt-1.5 max-w-[380px] text-[13px] leading-relaxed">
        Ligue pra recuperar horários cancelados sozinho: quando um dia lota, seus clientes entram na
        fila e a gente avisa se abrir vaga.
      </p>
      <Button asChild variant="coral" className="mt-4">
        <Link href="/settings">Ligar a fila de espera</Link>
      </Button>
    </div>
  );
}
