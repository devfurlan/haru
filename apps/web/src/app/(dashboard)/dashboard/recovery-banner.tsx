import Link from 'next/link';
import { Wallet } from 'lucide-react';

import type { RecoveryMetric } from '@/lib/waitlist-panel';

// Faixa de recuperação no Início: quanto a FILA DE ESPERA recuperou este mês, sozinha.
// Some quando não há nada recuperado (mesma regra do card de clientes sumidos).

export function RecoveryBanner({ metric }: { metric: RecoveryMetric }) {
  if (metric.count === 0) return null;

  return (
    <Link
      href="/appointments"
      className="border-line shadow-soft flex flex-wrap items-center gap-4 rounded-[18px] border p-5 transition-shadow hover:shadow-md"
      style={{
        background:
          'radial-gradient(460px 200px at 8% -40%, rgba(47,211,122,.16), transparent 62%), var(--brand-paper)',
      }}
    >
      <div className="bg-chip text-green-emph flex size-[46px] flex-none items-center justify-center rounded-[14px]">
        <Wallet className="size-6" strokeWidth={2.1} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-green-emph flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.13em]">
          <span className="bg-green-bright animate-pulse-ring size-[7px] rounded-full" />
          Fila de espera · recuperado este mês
        </div>
        <div className="mt-0.5 flex flex-wrap items-baseline gap-3">
          <span className="text-ink font-serif text-3xl">{metric.label}</span>
          <span className="text-ink-50 text-[12.5px] font-medium">
            {metric.countLabel} - você não fez nada
          </span>
        </div>
      </div>
      <div className="flex flex-none items-center gap-3.5">
        {metric.deltaLabel && (
          <span
            className={`bg-chip inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1.5 text-[11.5px] font-bold ${
              (metric.deltaPct ?? 0) >= 0 ? 'text-green-emph' : 'text-coral-deep'
            }`}
          >
            {metric.deltaLabel} vs. mês passado
          </span>
        )}
        <span className="text-green-emph whitespace-nowrap text-[12.5px] font-semibold">
          Ver a fila →
        </span>
      </div>
    </Link>
  );
}
