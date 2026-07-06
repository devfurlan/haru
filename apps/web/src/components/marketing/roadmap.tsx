import { Container } from './container';
import { SectionHeading } from './section-heading';

const road = [
  {
    h: 'Anexos do cliente',
    p: 'Envio de fotos, PDFs e comprovantes pelo chat (hoje são ignorados).',
  },
  {
    h: 'Avaliações dos clientes',
    p: 'Nota e comentário depois do atendimento, exibidos na sua página pública.',
  },
];

export function Roadmap() {
  return (
    <section id="breve" className="py-24">
      <Container>
        <SectionHeading eyebrow="No forno" title="O que vem por aí.">
          Recursos em desenvolvimento. Ainda não estão no ar - mas já estão no nosso mapa.
        </SectionHeading>
        <div className="grid gap-4 md:grid-cols-3">
          {road.map((r) => (
            <div
              key={r.h}
              className="border-border bg-paper relative rounded-xl border border-dashed p-6"
            >
              <span className="bg-coral/10 text-coral mb-3 inline-block rounded-md px-2.5 py-1 text-[0.68rem] font-extrabold uppercase tracking-[0.1em]">
                Em breve
              </span>
              <h4 className="mb-1.5 text-[1.02rem] font-bold">{r.h}</h4>
              <p className="text-ink-soft text-[0.88rem] leading-relaxed">{r.p}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
