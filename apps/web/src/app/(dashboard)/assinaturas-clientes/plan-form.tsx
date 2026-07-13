'use client';

import { useMemo, useState, useTransition } from 'react';
import { Repeat, Minus, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Input } from '@/components/ui/input';
import {
  createMembershipPlan,
  setMembershipPlanActive,
  updateMembershipPlan,
  type PlanInput,
} from '@/lib/memberships/plans';
import type { PlanRow } from '@/lib/subscriptions-panel';

export interface PlanFormServiceOption {
  id: string;
  name: string;
  priceCents: number;
}

interface PlanFormProps {
  plan?: PlanRow;
  services: PlanFormServiceOption[];
  onSuccess: () => void;
  onCancel: () => void;
}

const BRL2 = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
});
const brl2 = (cents: number) => BRL2.format(cents / 100);

const CREDITS_MIN = 1;
const CREDITS_MAX = 60;

/** Botão de escolha binária, mesmo estilo do form de fidelidade. */
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

function Stepper({
  value,
  onChange,
  min,
  max,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  label: string;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  return (
    <div className="flex items-center gap-3.5">
      <button
        type="button"
        onClick={() => onChange(clamp(value - 1))}
        className="border-edge text-ink-70 hover:bg-cream-2 flex size-10 items-center justify-center rounded-xl border transition-transform active:scale-95"
        aria-label={`Menos um ${label}`}
      >
        <Minus className="size-4" />
      </button>
      <div className="text-ink min-w-[56px] text-center font-serif text-[30px]">{value}</div>
      <button
        type="button"
        onClick={() => onChange(clamp(value + 1))}
        className="border-edge text-ink-70 hover:bg-cream-2 flex size-10 items-center justify-center rounded-xl border transition-transform active:scale-95"
        aria-label={`Mais um ${label}`}
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

export function PlanForm({ plan, services, onSuccess, onCancel }: PlanFormProps) {
  const editing = Boolean(plan);

  const [name, setName] = useState(plan?.name ?? '');
  const [selected, setSelected] = useState<Map<string, number>>(
    () => new Map((plan?.services ?? []).map((s) => [s.serviceId, s.creditCost])),
  );
  const [credits, setCredits] = useState(plan?.creditsPerCycle ?? 4);
  const [price, setPrice] = useState(plan ? (plan.priceCents / 100).toFixed(2) : '');
  const [rollover, setRollover] = useState(plan?.creditRollover ?? false);
  const [cap, setCap] = useState(plan?.rolloverCap != null ? String(plan.rolloverCap) : '');
  const [active, setActive] = useState(plan?.active ?? true);

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const priceCents = useMemo(() => {
    const n = parseFloat(price.replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(n) ? Math.round(n * 100) : 0;
  }, [price]);

  function toggleService(id: string) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(id)) next.delete(id);
      else next.set(id, 1);
      return next;
    });
  }

  function setCost(id: string, cost: number) {
    setSelected((prev) => {
      const next = new Map(prev);
      next.set(id, Math.max(1, cost));
      return next;
    });
  }

  // Ajuda de precificação: valor avulso das visitas cobertas vs. o preço do plano.
  const selectedOptions = services.filter((s) => selected.has(s.id));
  const avgServiceCents =
    selectedOptions.length > 0
      ? Math.round(selectedOptions.reduce((s, o) => s + o.priceCents, 0) / selectedOptions.length)
      : 0;
  const fullValueCents = credits * avgServiceCents;
  const discountPct =
    fullValueCents > 0 && priceCents > 0
      ? Math.round((1 - priceCents / fullValueCents) * 100)
      : null;

  let priceHelp = 'Escolha os serviços e os créditos - a gente te mostra se o preço faz sentido.';
  if (fullValueCents > 0) {
    if (priceCents <= 0) {
      priceHelp = `${credits} usos avulsos sairiam ~${brl2(fullValueCents)}. Um bom plano cobra 15-30% menos e garante que o cliente volte.`;
    } else if (discountPct == null || discountPct < 0) {
      priceHelp = `Avulso isso sairia ~${brl2(fullValueCents)}. Seu preço está acima disso - o cliente não teria vantagem em assinar.`;
    } else if (discountPct < 10) {
      priceHelp = `Desconto de ~${discountPct}% sobre o avulso (${brl2(fullValueCents)}). Pouco atrativo; 15-30% costuma converter melhor.`;
    } else if (discountPct <= 35) {
      priceHelp = `Desconto de ~${discountPct}% sobre o avulso (${brl2(fullValueCents)}). Ponto doce: bom pro cliente e ainda te garante recorrência.`;
    } else {
      priceHelp = `Desconto de ~${discountPct}% sobre o avulso (${brl2(fullValueCents)}). Enche a agenda, mas confira se a margem se paga.`;
    }
  }

  const rolloverLabel = rollover
    ? cap.trim()
      ? `Acumula até ${cap}`
      : 'Acumula sem limite'
    : 'Vencem no fim do mês';

  function submit() {
    setError(null);
    if (!name.trim()) return setError('Dê um nome ao plano.');
    if (priceCents <= 0) return setError('Informe o preço mensal.');
    if (selected.size === 0) return setError('Inclua pelo menos um serviço.');

    const input: PlanInput = {
      name: name.trim(),
      priceCents,
      creditsPerCycle: credits,
      creditRollover: rollover,
      rolloverCap: rollover && cap.trim() ? Number(cap) : null,
      services: [...selected.entries()].map(([serviceId, creditCost]) => ({ serviceId, creditCost })),
    };

    startTransition(async () => {
      const res = plan
        ? await updateMembershipPlan(plan.id, input)
        : await createMembershipPlan(input);
      if ('error' in res) {
        setError(res.error);
        return;
      }
      // Status é uma ação de engine separada (pausar/reativar a venda); só chama se mudou.
      if (editing && plan && active !== plan.active) {
        await setMembershipPlanActive(res.planId, active);
      }
      onSuccess();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* nome */}
      <div className="flex flex-col gap-2">
        <label htmlFor="plan-name" className="text-ink-70 text-xs font-semibold">
          Nome do plano
        </label>
        <Input
          id="plan-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Clube do Corte"
          maxLength={60}
        />
      </div>

      {/* serviços incluídos + custo em créditos */}
      <div className="flex flex-col gap-2">
        <span className="text-ink-70 text-xs font-semibold">Serviços incluídos</span>
        {services.length === 0 ? (
          <p className="text-ink-50 text-[12px]">Cadastre um serviço antes de montar o plano.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {services.map((s) => (
              <Chip key={s.id} selected={selected.has(s.id)} onClick={() => toggleService(s.id)}>
                {s.name}
              </Chip>
            ))}
          </div>
        )}
        {selectedOptions.length > 0 && (
          <div className="border-edge bg-cream-2/40 mt-1 flex flex-col gap-1.5 rounded-xl border p-2.5">
            <span className="text-ink-50 text-[11px] font-semibold">
              Quantos créditos cada agendamento gasta
            </span>
            {selectedOptions.map((s) => {
              const cost = selected.get(s.id) ?? 1;
              return (
                <div key={s.id} className="flex items-center gap-2">
                  <span className="text-ink min-w-0 flex-1 truncate text-[13px] font-medium">
                    {s.name}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCost(s.id, cost - 1)}
                      className="border-edge text-ink-70 hover:bg-cream-2 flex size-7 items-center justify-center rounded-lg border"
                      aria-label={`Menos um crédito em ${s.name}`}
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <span className="text-ink min-w-[52px] text-center text-[12px] font-semibold">
                      {cost} {cost === 1 ? 'crédito' : 'créd.'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCost(s.id, cost + 1)}
                      className="border-edge text-ink-70 hover:bg-cream-2 flex size-7 items-center justify-center rounded-lg border"
                      aria-label={`Mais um crédito em ${s.name}`}
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* créditos por mês */}
      <div className="flex flex-col gap-2">
        <span className="text-ink-70 text-xs font-semibold">Créditos por mês</span>
        <div className="flex flex-wrap items-center gap-3.5">
          <Stepper value={credits} onChange={setCredits} min={CREDITS_MIN} max={CREDITS_MAX} label="crédito" />
          <span className="text-ink-50 max-w-[220px] text-[12px] leading-snug">
            Quantas vezes o cliente pode usar por mês. Ex.: 4 = um corte por semana.
          </span>
        </div>
      </div>

      {/* preço + ajuda de precificação */}
      <div className="flex flex-col gap-2">
        <label htmlFor="plan-price" className="text-ink-70 text-xs font-semibold">
          Preço mensal
        </label>
        <div className="relative max-w-[200px]">
          <span className="text-ink-50 pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm">
            R$
          </span>
          <Input
            id="plan-price"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/[^\d.,]/g, ''))}
            placeholder="0,00"
            className="pl-9"
          />
        </div>
        <p className="text-ink-50 text-[12px] leading-snug">{priceHelp}</p>
      </div>

      {/* acúmulo de créditos */}
      <div className="flex flex-col gap-2">
        <span className="text-ink-70 text-xs font-semibold">Créditos não usados</span>
        <div className="flex gap-2">
          <ToggleOption selected={!rollover} onClick={() => setRollover(false)}>
            Vencem no mês
          </ToggleOption>
          <ToggleOption selected={rollover} onClick={() => setRollover(true)}>
            Acumulam
          </ToggleOption>
        </div>
        {rollover && (
          <div className="flex items-center gap-2.5">
            <span className="text-ink-50 text-[12px]">Teto de acúmulo</span>
            <Input
              value={cap}
              onChange={(e) => setCap(e.target.value.replace(/[^\d]/g, ''))}
              placeholder="Sem limite"
              inputMode="numeric"
              className="max-w-[130px]"
            />
          </div>
        )}
      </div>

      {/* status (só na edição - criar já nasce ativo) */}
      {editing && (
        <div className="flex flex-col gap-2">
          <span className="text-ink-70 text-xs font-semibold">Status</span>
          <div className="flex gap-2">
            <ToggleOption selected={active} onClick={() => setActive(true)}>
              Ativo (à venda)
            </ToggleOption>
            <ToggleOption selected={!active} onClick={() => setActive(false)}>
              Pausado
            </ToggleOption>
          </div>
          {!active && (
            <p className="text-ink-50 text-[12px] leading-snug">
              Some da vitrine e para de vender - quem já assina continua com os créditos.
            </p>
          )}
        </div>
      )}

      {/* preview: como o cliente vê */}
      <div className="flex flex-col gap-2">
        <span className="text-ink-50 text-[10.5px] font-bold uppercase tracking-[0.14em]">
          Como o cliente vê
        </span>
        <div className="bg-green-deep text-on-emerald relative overflow-hidden rounded-[18px] px-[18px] py-4">
          <div className="flex items-center gap-2">
            <span className="bg-on-emerald/10 flex size-8 items-center justify-center rounded-lg">
              <Repeat className="size-4" />
            </span>
            <div className="text-on-emerald-mut text-[9.5px] font-bold uppercase tracking-[0.14em]">
              Plano de assinatura
            </div>
          </div>
          <div className="mt-2.5 font-serif text-[19px]">{name.trim() || 'Seu plano'}</div>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span className="text-green-bright font-serif text-[26px]">
              {priceCents > 0 ? brl2(priceCents) : 'R$ --'}
            </span>
            <span className="text-on-emerald-mut text-xs">/mês</span>
          </div>
          <div className="border-on-emerald/25 my-3 h-0 border-t border-dashed" />
          <div className="font-serif text-[13px]">
            {credits} {credits === 1 ? 'crédito' : 'créditos'} por mês · {rolloverLabel.toLowerCase()}
          </div>
          <div className="text-on-emerald-mut mt-1 text-[11.5px]">
            {selectedOptions.length > 0
              ? `Vale em: ${selectedOptions.map((s) => s.name).join(', ')}`
              : 'Escolha os serviços que o plano cobre.'}
          </div>
        </div>
      </div>

      {error && <p className="text-coral-deep text-sm">{error}</p>}

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
          Cancelar
        </Button>
        <Button type="button" variant="coral" onClick={submit} disabled={pending}>
          {pending ? 'Salvando…' : editing ? 'Salvar plano' : 'Criar plano'}
        </Button>
      </div>
    </div>
  );
}
