import { Container } from './container';
import { SectionHeading } from './section-heading';

const road = [
  {
    h: 'Atendimento humano',
    p: 'Transferência da conversa pra você quando o cliente pedir um humano.',
  },
  {
    h: 'Anexos do cliente',
    p: 'Envio de fotos, PDFs e comprovantes pelo chat (hoje são ignorados).',
  },
  {
    h: 'Múltiplos profissionais',
    p: 'Agenda separada por profissional da equipe, cada um com seus horários.',
  },
];

export function Roadmap() {
  return (
    <section id="breve" className="bg-cream-2 py-24">
      <Container>
        <SectionHeading eyebrow="No forno" title="O que vem por aí.">
          Recursos em desenvolvimento. Ainda não estão no ar — mas já estão no nosso mapa.
        </SectionHeading>
        <div className="grid gap-4 md:grid-cols-3">
          {road.map((r) => (
            <div
              key={r.h}
              className="relative rounded-xl border border-dashed border-border bg-paper p-6"
            >
              <span className="mb-3 inline-block rounded-md bg-coral/10 px-2.5 py-1 text-[0.68rem] font-extrabold uppercase tracking-[0.1em] text-coral">
                Em breve
              </span>
              <h4 className="mb-1.5 text-[1.02rem] font-bold">{r.h}</h4>
              <p className="text-[0.88rem] leading-relaxed text-ink-soft">{r.p}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
