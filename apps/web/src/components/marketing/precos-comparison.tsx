import { Check, X } from 'lucide-react';

import { Container } from './container';
import { SectionHeading } from './section-heading';

// Sem citar nomes (evita briga jurídica) - só comunica a diferenciação.
const rows = [
  { label: 'App do cliente + agenda na web', them: 'Só link ou WhatsApp' },
  { label: 'Funciona sem depender da Meta', them: 'Preso ao WhatsApp' },
  { label: 'Sua marca, sem marketplace', them: 'Vitrine com concorrente' },
  { label: 'Pagamento online (Pix + cartão)', them: 'Add-on pago' },
  { label: 'Setup em minutos', them: 'Semanas' },
];

export function PrecosComparison() {
  return (
    <section className="bg-cream-2 py-24">
      <Container>
        <SectionHeading eyebrow="Comparativo" title="O que muda pra você." />
        <div className="border-border bg-paper mx-auto max-w-[760px] overflow-hidden rounded-3xl border">
          <div className="border-border grid grid-cols-[1fr_auto_auto] items-center gap-x-6 border-b px-6 py-4 text-sm font-bold sm:gap-x-10">
            <span />
            <span className="text-coral text-center">Demandaê</span>
            <span className="text-ink-soft/70 text-center">Tradicionais</span>
          </div>
          {rows.map(({ label, them }) => (
            <div
              key={label}
              className="border-border grid grid-cols-[1fr_auto_auto] items-center gap-x-6 border-b px-6 py-4 text-sm last:border-b-0 sm:gap-x-10"
            >
              <span className="font-medium">{label}</span>
              <span className="flex justify-center">
                <Check aria-label="sim" strokeWidth={3} className="text-green-bright size-5" />
              </span>
              <span className="text-ink-soft/60 flex items-center justify-center gap-1.5">
                <X aria-hidden strokeWidth={3} className="size-4 shrink-0" />
                <span className="hidden text-xs sm:inline">{them}</span>
              </span>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
