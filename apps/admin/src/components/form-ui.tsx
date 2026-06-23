'use client';

import { Button } from '@haru/ui/components/button';

import { Label } from '@/components/ui/label';

export type FormResult = { error: string } | { ok: true } | undefined;

/** Linha final do form: feedback (erro/sucesso) + botão salvar com estado pending. */
export function SaveRow({ state, pending }: { state: FormResult; pending: boolean }) {
  return (
    <div className="flex items-center justify-end gap-3 pt-1">
      {state && 'error' in state && <span className="text-sm text-destructive">{state.error}</span>}
      {state && 'ok' in state && <span className="text-sm text-green">Salvo ✓</span>}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? 'Salvando...' : 'Salvar'}
      </Button>
    </div>
  );
}

/** Campo rotulado simples (label em cima, controle embaixo). */
export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
