import { Container } from './container';

const pills = [
  { emoji: '✂️', label: 'Barbearias' },
  { emoji: '💇', label: 'Salões' },
  { emoji: '🩺', label: 'Clínicas' },
  { emoji: '🦶', label: 'Podólogas' },
  { emoji: '🎨', label: 'Estúdios' },
  { emoji: '➕', label: 'e afins' },
];

export function ForWho() {
  return (
    <section className="border-b border-border bg-cream-2 py-12">
      <Container className="flex flex-wrap items-center justify-between gap-8">
        <p className="max-w-[230px] text-[0.95rem] font-bold">
          Feito pra quem <b className="text-green">vive de horário marcado</b> e atende pelo
          WhatsApp.
        </p>
        <div className="flex flex-wrap gap-3">
          {pills.map((p) => (
            <span
              key={p.label}
              className="flex items-center gap-2 rounded-full border border-border bg-paper px-[18px] py-2.5 text-[0.93rem] font-semibold shadow-sm"
            >
              <span className="text-base">{p.emoji}</span> {p.label}
            </span>
          ))}
        </div>
      </Container>
    </section>
  );
}
