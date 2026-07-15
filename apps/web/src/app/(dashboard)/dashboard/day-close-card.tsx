'use client';

import { Check, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';

import { closeDay } from './day-close-actions';

export interface DayCloseAppt {
  id: string;
  clientName: string;
  timeLabel: string;
  serviceName: string;
  priceLabel: string;
  /** Estado inicial do check (true = compareceu). */
  attended: boolean;
}
export interface DayCloseGroup {
  professionalName: string;
  appts: DayCloseAppt[];
}

export function DayCloseCard({
  groups,
  allConfirmed,
}: {
  groups: DayCloseGroup[];
  allConfirmed: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const all = useMemo(() => groups.flatMap((g) => g.appts), [groups]);
  // Set de quem compareceu (marcado). Só desmarcar aponta falta.
  const [attended, setAttended] = useState<Set<string>>(
    () => new Set(all.filter((a) => a.attended).map((a) => a.id)),
  );

  if (all.length === 0) return null;

  // Dia já fechado (todos confirmados pelo dono): estado discreto, não some pra dar o "feito".
  if (allConfirmed) {
    return (
      <div className="border-line bg-paper shadow-soft flex items-center gap-2.5 rounded-[18px] border px-[18px] py-3.5">
        <CheckCircle2 className="text-green-emph size-5" strokeWidth={2.2} />
        <div className="text-ink text-sm font-semibold">
          Dia fechado{' '}
          <span className="text-ink-50 font-medium">· {all.length} atendimentos confirmados</span>
        </div>
      </div>
    );
  }

  const toggle = (id: string) =>
    setAttended((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const noShowCount = all.length - attended.size;

  const confirm = () => {
    const attendedIds = [...attended];
    const noShowIds = all.filter((a) => !attended.has(a.id)).map((a) => a.id);
    startTransition(async () => {
      await closeDay({ attendedIds, noShowIds });
      router.refresh();
    });
  };

  return (
    <div className="border-line bg-paper shadow-soft overflow-hidden rounded-[18px] border">
      <div className="px-[18px] pb-1 pt-4">
        <div className="text-ink font-serif text-lg">Fechar o dia</div>
        <div className="text-ink-50 text-xs font-medium">
          Já vem tudo como <em className="text-green-emph font-semibold not-italic">atendido</em> ·
          só desmarque quem faltou
        </div>
      </div>

      {groups.map((g) => (
        <div key={g.professionalName}>
          <div className="text-ink-50 border-edge mt-2 border-t border-dotted px-[18px] pb-1 pt-2.5 text-[11px] font-bold uppercase tracking-[0.1em]">
            {g.professionalName} · {g.appts.length}{' '}
            {g.appts.length === 1 ? 'atendimento' : 'atendimentos'}
          </div>
          {g.appts.map((a) => {
            const on = attended.has(a.id);
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => toggle(a.id)}
                className="hover:bg-cream/60 flex w-full items-center gap-3 px-[18px] py-2 text-left transition"
              >
                <span
                  className={`flex size-[22px] flex-none items-center justify-center rounded-md border transition ${
                    on
                      ? 'border-green-emph bg-green-emph text-white'
                      : 'border-edge bg-paper text-transparent'
                  }`}
                >
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
                <span className="text-ink w-[46px] flex-none font-serif text-sm">
                  {a.timeLabel}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-[13.5px] font-semibold ${on ? 'text-ink' : 'text-ink-50 line-through'}`}
                  >
                    {a.clientName}
                  </span>
                  <span className="text-ink-50 block truncate text-[11.5px] font-medium">
                    {a.serviceName}
                  </span>
                </span>
                <span className="text-ink-70 w-[64px] flex-none text-right font-serif text-[13.5px]">
                  {a.priceLabel}
                </span>
                {/* Atendido é o estado calmo (só o check); só a exceção "faltou" ganha rótulo. */}
                <span className="text-coral-deep w-[52px] flex-none text-right text-[10.5px] font-bold uppercase tracking-wide">
                  {on ? '' : 'faltou'}
                </span>
              </button>
            );
          })}
        </div>
      ))}

      <div className="border-line flex flex-wrap items-center gap-3 border-t px-[18px] py-3">
        <div className="text-ink-50 text-xs font-medium">
          {attended.size} {attended.size === 1 ? 'veio' : 'vieram'}
          {noShowCount > 0 && (
            <span className="text-coral-deep">
              {' '}
              · {noShowCount} {noShowCount === 1 ? 'faltou' : 'faltaram'}
            </span>
          )}
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={confirm}
          className="bg-coral ml-auto rounded-xl px-5 py-2.5 text-[13px] font-semibold text-white transition hover:brightness-105 active:scale-[.97] disabled:opacity-60"
        >
          {pending
            ? 'Confirmando...'
            : noShowCount > 0
              ? 'Confirmar presenças'
              : 'Confirmar tudo atendido'}
        </button>
      </div>
    </div>
  );
}
