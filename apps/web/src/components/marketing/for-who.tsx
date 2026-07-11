import { Flower2, Footprints, PenTool, Scissors, Sparkles, Stethoscope } from 'lucide-react';

import { Container } from './container';

const segments = [
  { Icon: Scissors, label: 'Barbearia', active: true },
  { Icon: Flower2, label: 'Salão' },
  { Icon: Stethoscope, label: 'Clínica' },
  { Icon: Footprints, label: 'Podologia' },
  { Icon: Sparkles, label: 'Estética' },
  { Icon: PenTool, label: 'Tatuagem' },
];

export function ForWho() {
  return (
    <section className="border-edge bg-cream border-b">
      <Container className="flex flex-col items-center justify-between gap-5 py-7 lg:flex-row">
        <span className="text-ink-70 shrink-0 font-serif text-base italic">
          Feito pra quem atende com hora marcada -
        </span>
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {segments.map(({ Icon, label, active }) => (
            <span
              key={label}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors ${
                active
                  ? 'bg-green-deep border-green-deep text-cream'
                  : 'bg-paper border-edge text-ink hover:border-green-deep'
              }`}
            >
              <Icon
                className={`size-4 ${active ? 'text-green-bright' : 'text-green-deep'}`}
                aria-hidden
              />
              {label}
            </span>
          ))}
        </div>
      </Container>
    </section>
  );
}
