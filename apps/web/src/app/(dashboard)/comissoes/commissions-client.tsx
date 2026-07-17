'use client';

import { Check, Copy, Pencil } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { COMPENSATION_MODEL_LABEL, type CompensationConfig } from '@/lib/commission-core';
import type { CompensationModel } from '@haru/database';

import { setCompensation } from './actions';

const MODELS: CompensationModel[] = ['COMMISSION_PERCENT', 'FIXED_PER_SERVICE', 'CHAIR_RENT'];
const MODEL_HINT: Record<CompensationModel, string> = {
  COMMISSION_PERCENT: 'O profissional fica com uma % do valor de cada serviço.',
  FIXED_PER_SERVICE: 'O profissional recebe um valor fixo por atendimento, independente do preço.',
  CHAIR_RENT: 'O profissional paga um aluguel à casa e fica com 100% dos serviços.',
};

const centsToReais = (c: number | null | undefined) =>
  c == null ? '' : String(c / 100).replace('.', ',');
const reaisToCents = (s: string): number => {
  const n = parseFloat(s.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n * 100) : -1;
};

/** Editar remuneração de um profissional. Modal com ação -> não fecha por fora (só X/Cancelar). */
export function CompensationEditor({
  pro,
}: {
  pro: { id: string; name: string | null; config: CompensationConfig | null };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [model, setModel] = useState<CompensationModel>(pro.config?.model ?? 'COMMISSION_PERCENT');
  const [pct, setPct] = useState(pro.config?.commissionPercent?.toString() ?? '');
  const [fixed, setFixed] = useState(centsToReais(pro.config?.fixedPerServiceCents));
  const [rent, setRent] = useState(centsToReais(pro.config?.chairRentCents));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setError(null);
    const input = { professionalId: pro.id, model } as Parameters<typeof setCompensation>[0];
    if (model === 'COMMISSION_PERCENT') input.commissionPercent = Math.round(Number(pct));
    if (model === 'FIXED_PER_SERVICE') input.fixedPerServiceCents = reaisToCents(fixed);
    if (model === 'CHAIR_RENT') input.chairRentCents = reaisToCents(rent);
    start(async () => {
      const r = await setCompensation(input);
      if ('error' in r) setError(r.error);
      else {
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-green-emph inline-flex items-center gap-1.5 text-[12.5px] font-semibold hover:underline"
      >
        <Pencil className="size-3.5" strokeWidth={2.2} />
        {pro.config ? 'Editar' : 'Definir'}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dismissable={false} className="max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Remuneração de {pro.name ?? 'profissional'}</DialogTitle>
            <DialogDescription>Como esse profissional é pago no fechamento.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2.5">
            {MODELS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setModel(m)}
                className={`rounded-2xl border p-3 text-left transition-colors ${
                  model === m
                    ? 'border-green-emph bg-chip'
                    : 'border-line bg-paper hover:bg-cream-2'
                }`}
              >
                <div className="text-ink text-[13.5px] font-semibold">
                  {COMPENSATION_MODEL_LABEL[m]}
                </div>
                <div className="text-ink-50 mt-0.5 text-[11.5px] leading-snug">{MODEL_HINT[m]}</div>
              </button>
            ))}
          </div>

          <div className="mt-1">
            {model === 'COMMISSION_PERCENT' && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pct">Percentual do profissional (%)</Label>
                <Input
                  id="pct"
                  inputMode="numeric"
                  value={pct}
                  onChange={(e) => setPct(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="Ex.: 50"
                />
              </div>
            )}
            {model === 'FIXED_PER_SERVICE' && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fixed">Valor por atendimento (R$)</Label>
                <Input
                  id="fixed"
                  inputMode="decimal"
                  value={fixed}
                  onChange={(e) => setFixed(e.target.value.replace(/[^0-9.,]/g, ''))}
                  placeholder="Ex.: 30"
                />
              </div>
            )}
            {model === 'CHAIR_RENT' && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rent">Aluguel mensal (R$)</Label>
                <Input
                  id="rent"
                  inputMode="decimal"
                  value={rent}
                  onChange={(e) => setRent(e.target.value.replace(/[^0-9.,]/g, ''))}
                  placeholder="Ex.: 800"
                />
                <p className="text-ink-50 text-[11.5px] leading-snug">
                  A casa recebe esse valor do profissional; ele fica com 100% dos serviços.
                </p>
              </div>
            )}
          </div>

          {error && <p className="text-coral-deep text-[12.5px] font-medium">{error}</p>}

          <div className="mt-1 flex justify-end gap-2.5">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button variant="coral" onClick={save} disabled={pending}>
              {pending ? 'Salvando…' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Copia o resumo do fechamento pra o dono colar onde quiser (WhatsApp, planilha). */
export function CopySummaryButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="outline"
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        });
      }}
    >
      {copied ? (
        <>
          <Check className="size-4" strokeWidth={2.2} /> Copiado
        </>
      ) : (
        <>
          <Copy className="size-4" strokeWidth={2.2} /> Copiar resumo
        </>
      )}
    </Button>
  );
}
