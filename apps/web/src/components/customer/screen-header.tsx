'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Cabeçalho das telas empilhadas do cliente (sub-páginas de perfil, detalhe): botão
// voltar em caixa "paper" + título Fraunces, com eyebrow opcional. Espelha
// apps/mobile/src/components/screen-header.tsx. `backHref` fixa o destino; sem ele volta.
export function ScreenHeader({
  title,
  eyebrow,
  backHref,
}: {
  title: string;
  eyebrow?: string;
  backHref?: string;
}) {
  const router = useRouter();
  return (
    <div className="px-5 pb-2 pt-6">
      <button
        type="button"
        onClick={() => (backHref ? router.push(backHref) : router.back())}
        aria-label="Voltar"
        className="border-edge bg-paper text-green-deep flex h-[42px] w-[42px] items-center justify-center rounded-[14px] border transition-transform active:scale-[0.95]"
      >
        <ArrowLeft className="h-5 w-5" strokeWidth={2.2} />
      </button>
      {eyebrow ? <p className="text-muted-foreground mt-4 text-sm">{eyebrow}</p> : null}
      <h1
        className={`text-ink font-serif text-[28px] tracking-tight ${eyebrow ? 'mt-0.5' : 'mt-4'}`}
      >
        {title}
      </h1>
    </div>
  );
}
