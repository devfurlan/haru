'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import {
  DISCOUNT_OPTIONS,
  STAMP_MAX,
  STAMP_MIN,
  STAMP_DEFAULT,
  TTL_OPTIONS,
  prizeLabelOf,
  type LoyaltyCountMode,
  type LoyaltyPrizeKind,
  type LoyaltyProgramView,
} from '@/lib/loyalty-constants';

import { saveLoyaltyProgram, type LoyaltyActionResult } from './actions';

export interface ServiceOption {
  id: string;
  name: string;
}

interface LoyaltyFormProps {
  program?: LoyaltyProgramView;
  services: ServiceOption[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="coral" disabled={pending}>
      {pending ? 'Salvando…' : editing ? 'Salvar' : 'Criar programa'}
    </Button>
  );
}

/** Botão de escolha binária (prêmio / o que vale), estilo do protótipo. */
function ToggleOption({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 whitespace-nowrap rounded-xl border px-3 py-3 text-center text-[12.5px] font-semibold transition-colors ${
        selected
          ? 'border-green-deep bg-chip text-green-emph'
          : 'border-edge bg-paper text-ink-70 hover:bg-cream-2'
      }`}
    >
      {children}
    </button>
  );
}

export function LoyaltyForm({ program, services, onSuccess, onCancel }: LoyaltyFormProps) {
  const editing = Boolean(program);

  const [state, formAction] = useActionState<LoyaltyActionResult | undefined, FormData>(
    saveLoyaltyProgram,
    undefined,
  );

  const [prizeKind, setPrizeKind] = useState<LoyaltyPrizeKind>(
    program?.prizeKind ?? 'FREE_SERVICE',
  );
  const [prizeServiceId, setPrizeServiceId] = useState(
    program?.prizeServiceId ?? services[0]?.id ?? '',
  );
  const [discount, setDiscount] = useState(program?.discountPercent ?? 30);
  const [stamps, setStamps] = useState(program?.stampsRequired ?? STAMP_DEFAULT);
  const [countMode, setCountMode] = useState<LoyaltyCountMode>(
    program?.countMode ?? 'ALL_SERVICES',
  );
  const [qualifying, setQualifying] = useState<Set<string>>(
    () => new Set(program?.qualifyingServiceIds ?? []),
  );
  const [ttl, setTtl] = useState<number | null>(
    program?.stampTtlDays === undefined ? 180 : program.stampTtlDays,
  );

  useEffect(() => {
    if (state && 'ok' in state) onSuccess?.();
  }, [state, onSuccess]);

  const prizeServiceName = services.find((s) => s.id === prizeServiceId)?.name ?? null;
  const prizeText = prizeLabelOf({ prizeKind, prizeServiceName, discountPercent: discount });

  const clamp = (n: number) => Math.min(STAMP_MAX, Math.max(STAMP_MIN, n));

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {/* hidden fields lidos pela action */}
      <input type="hidden" name="prizeKind" value={prizeKind} />
      {prizeKind === 'FREE_SERVICE' && (
        <input type="hidden" name="prizeServiceId" value={prizeServiceId} />
      )}
      {prizeKind === 'DISCOUNT' && <input type="hidden" name="discountPercent" value={discount} />}
      <input type="hidden" name="stampsRequired" value={stamps} />
      <input type="hidden" name="countMode" value={countMode} />
      <input type="hidden" name="stampTtlDays" value={ttl ?? ''} />
      {countMode === 'SPECIFIC' &&
        [...qualifying].map((id) => (
          <input key={id} type="hidden" name="qualifyingServiceIds" value={id} />
        ))}

      {/* o prêmio */}
      <div className="flex flex-col gap-2">
        <span className="text-ink-70 text-xs font-semibold">O prêmio</span>
        <div className="flex gap-2">
          <ToggleOption
            selected={prizeKind === 'FREE_SERVICE'}
            onClick={() => setPrizeKind('FREE_SERVICE')}
          >
            Serviço de graça
          </ToggleOption>
          <ToggleOption
            selected={prizeKind === 'DISCOUNT'}
            onClick={() => setPrizeKind('DISCOUNT')}
          >
            Desconto
          </ToggleOption>
        </div>
        {prizeKind === 'FREE_SERVICE' ? (
          <div className="flex flex-wrap gap-2">
            {services.length === 0 ? (
              <p className="text-ink-50 text-[12px]">
                Cadastre um serviço antes de criar o prêmio.
              </p>
            ) : (
              services.map((s) => (
                <Chip
                  key={s.id}
                  selected={prizeServiceId === s.id}
                  onClick={() => setPrizeServiceId(s.id)}
                >
                  {s.name}
                </Chip>
              ))
            )}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {DISCOUNT_OPTIONS.map((d) => (
              <Chip key={d} selected={discount === d} onClick={() => setDiscount(d)}>
                {d}%
              </Chip>
            ))}
          </div>
        )}
      </div>

      {/* quantos carimbos */}
      <div className="flex flex-col gap-2">
        <span className="text-ink-70 text-xs font-semibold">Quantos carimbos pra ganhar?</span>
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={() => setStamps((n) => clamp(n - 1))}
            className="border-edge text-ink-70 hover:bg-cream-2 flex size-10 items-center justify-center rounded-xl border text-lg font-semibold transition-transform active:scale-95"
            aria-label="Menos um carimbo"
          >
            −
          </button>
          <div className="text-ink min-w-[56px] text-center font-serif text-[30px]">{stamps}</div>
          <button
            type="button"
            onClick={() => setStamps((n) => clamp(n + 1))}
            className="border-edge text-ink-70 hover:bg-cream-2 flex size-10 items-center justify-center rounded-xl border text-lg font-semibold transition-transform active:scale-95"
            aria-label="Mais um carimbo"
          >
            +
          </button>
          <span className="text-ink-50 text-[12px] leading-snug">
            Entre {STAMP_MIN} e {STAMP_MAX}. Pra corte quinzenal, 10 fecha em ~5 meses.
          </span>
        </div>
      </div>

      {/* o que vale carimbo */}
      <div className="flex flex-col gap-2">
        <span className="text-ink-70 text-xs font-semibold">O que vale carimbo</span>
        <div className="flex gap-2">
          <ToggleOption
            selected={countMode === 'ALL_SERVICES'}
            onClick={() => setCountMode('ALL_SERVICES')}
          >
            Qualquer serviço
          </ToggleOption>
          <ToggleOption
            selected={countMode === 'SPECIFIC'}
            onClick={() => setCountMode('SPECIFIC')}
          >
            Escolher serviços
          </ToggleOption>
        </div>
        {countMode === 'SPECIFIC' && (
          <div className="flex flex-wrap gap-2">
            {services.map((s) => (
              <Chip
                key={s.id}
                selected={qualifying.has(s.id)}
                onClick={() =>
                  setQualifying((prev) => {
                    const next = new Set(prev);
                    if (next.has(s.id)) next.delete(s.id);
                    else next.add(s.id);
                    return next;
                  })
                }
              >
                {s.name}
              </Chip>
            ))}
          </div>
        )}
      </div>

      {/* validade */}
      <div className="flex flex-col gap-2">
        <span className="text-ink-70 text-xs font-semibold">Validade dos carimbos</span>
        <div className="flex flex-wrap gap-2">
          {TTL_OPTIONS.map((o) => (
            <Chip key={o.label} selected={ttl === o.days} onClick={() => setTtl(o.days)}>
              {o.label}
            </Chip>
          ))}
        </div>
      </div>

      {/* preview: como o cliente vê */}
      <div className="flex flex-col gap-2">
        <span className="text-ink-50 text-[10.5px] font-bold uppercase tracking-[0.14em]">
          Como o cliente vê
        </span>
        <div className="bg-green-deep text-on-emerald relative overflow-hidden rounded-[18px] px-[18px] py-4">
          <div className="text-on-emerald-mut text-[9.5px] font-bold uppercase tracking-[0.14em]">
            Cartão fidelidade
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {Array.from({ length: stamps }).map((_, i) => (
              <div
                key={i}
                className="border-on-emerald/35 size-[26px] rounded-full border-[1.5px]"
              />
            ))}
          </div>
          <div className="border-on-emerald/25 my-2.5 h-0 border-t border-dashed" />
          <div className="font-serif text-[13px]">
            Junte {stamps} carimbos e ganhe {prizeText}.
          </div>
        </div>
      </div>

      {state && 'error' in state && <p className="text-coral-deep text-sm">{state.error}</p>}

      <div className="flex items-center justify-end gap-2 pt-1">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <SubmitButton editing={editing} />
      </div>
    </form>
  );
}
