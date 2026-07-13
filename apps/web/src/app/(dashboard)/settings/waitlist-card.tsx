'use client';

// Card de config da Fila de espera (em /settings). Salva na hora (otimista), como os
// switches de avisos. O dono só liga e ajusta - a fila opera sozinha.

import { Info } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { SegmentedControl } from '@/components/ui/segmented-control';
import { Switch } from '@/components/ui/switch';
import { WAVE_SIZE, WINDOW_MAX_MINUTES, WINDOW_MIN_MINUTES } from '@/lib/waitlist-core';

import { updateWaitlistSettings } from './waitlist-settings-actions';

export function WaitlistCard({
  enabled: initialEnabled,
  windowMinutes: initialWindow,
  notifyAllAtOnce: initialAllAtOnce,
}: {
  enabled: boolean;
  windowMinutes: number;
  notifyAllAtOnce: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [windowMinutes, setWindowMinutes] = useState(initialWindow);
  const [allAtOnce, setAllAtOnce] = useState(initialAllAtOnce);
  const [, startTransition] = useTransition();

  function save(
    patch: { enabled?: boolean; windowMinutes?: number; notifyAllAtOnce?: boolean },
    revert: () => void,
  ) {
    startTransition(async () => {
      const res = await updateWaitlistSettings(patch);
      if ('error' in res) {
        revert();
        toast.error(res.error);
      }
    });
  }

  function toggleEnabled(next: boolean) {
    setEnabled(next);
    save({ enabled: next }, () => setEnabled(!next));
  }

  function bumpWindow(delta: number) {
    const next = Math.min(WINDOW_MAX_MINUTES, Math.max(WINDOW_MIN_MINUTES, windowMinutes + delta));
    if (next === windowMinutes) return;
    const prev = windowMinutes;
    setWindowMinutes(next);
    save({ windowMinutes: next }, () => setWindowMinutes(prev));
  }

  function setMode(all: boolean) {
    if (all === allAtOnce) return;
    setAllAtOnce(all);
    save({ notifyAllAtOnce: all }, () => setAllAtOnce(!all));
  }

  return (
    <div className="border-line bg-paper shadow-soft rounded-[18px] border p-[18px]">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="text-ink font-serif text-[16px]">Fila de espera</div>
          <div className="text-ink-50 mt-0.5 text-[12px] font-medium leading-snug">
            Dia lotado com um profissional vira fila. Se abrir vaga, a gente avisa quem espera -
            sozinho. Você só acompanha.
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={toggleEnabled} />
      </div>

      {enabled && (
        <>
          <div className="border-edge mt-3.5 flex flex-wrap items-center gap-3 border-t border-dotted pt-3.5">
            <div className="min-w-[200px] flex-1">
              <div className="text-ink text-[13.5px] font-semibold">Janela de confirmação</div>
              <div className="text-ink-50 text-[11.5px] font-medium leading-snug">
                Tempo que cada cliente tem pra confirmar a vaga antes de passar pro próximo da fila.
              </div>
            </div>
            <div className="border-edge bg-paper flex flex-none items-center gap-0.5 rounded-full border p-1">
              <button
                type="button"
                aria-label="Menos tempo"
                onClick={() => bumpWindow(-5)}
                disabled={windowMinutes <= WINDOW_MIN_MINUTES}
                className="text-ink-70 hover:bg-cream-2 flex size-8 items-center justify-center rounded-full text-lg font-semibold disabled:opacity-40"
              >
                −
              </button>
              <div className="text-ink min-w-[64px] text-center font-serif text-sm">
                {windowMinutes} min
              </div>
              <button
                type="button"
                aria-label="Mais tempo"
                onClick={() => bumpWindow(5)}
                disabled={windowMinutes >= WINDOW_MAX_MINUTES}
                className="text-ink-70 hover:bg-cream-2 flex size-8 items-center justify-center rounded-full text-lg font-semibold disabled:opacity-40"
              >
                +
              </button>
            </div>
          </div>

          <div className="border-edge mt-3.5 border-t border-dotted pt-3.5">
            <div className="text-ink text-[13.5px] font-semibold">Como avisar a fila</div>
            <div className="text-ink-50 mb-2.5 mt-0.5 text-[11.5px] font-medium leading-snug">
              Em ondas: avisamos aos poucos pra não frustrar seus clientes. Todo mundo: dispara pra
              fila inteira de uma vez.
            </div>
            <SegmentedControl
              value={allAtOnce ? 'all' : 'waves'}
              onChange={(v) => setMode(v === 'all')}
              options={[
                { label: 'Em ondas', value: 'waves' },
                { label: 'Todo mundo', value: 'all' },
              ]}
            />
            {!allAtOnce && (
              <div className="bg-chip text-green-emph mt-3 flex items-start gap-2 rounded-xl px-3 py-2.5 text-[11.5px] leading-relaxed">
                <Info className="mt-0.5 size-[15px] flex-none" strokeWidth={2} />
                Avisamos os {WAVE_SIZE} primeiros da fila. Se ninguém confirmar na janela, chamamos
                os próximos - assim a vaga não fica presa e ninguém se frustra à toa.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
