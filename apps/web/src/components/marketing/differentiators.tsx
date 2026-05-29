import { Container } from './container';
import { SectionHeading } from './section-heading';

const diffs = [
  {
    n: '01',
    h: 'Zero fricção',
    p: 'Seu cliente agenda pelo WhatsApp dele, do jeito que já usa. Sem app novo, sem baixar nada.',
  },
  {
    n: '02',
    h: 'IA de verdade',
    p: 'Entende texto livre e até áudio. Nada de menu robótico travado.',
  },
  {
    n: '03',
    h: 'Menos faltas',
    p: 'Lembrete automático antes do horário reduz o no-show sem você lembrar nada.',
  },
  {
    n: '04',
    h: 'Agenda certa',
    p: 'A IA respeita seu expediente e nunca marca em cima de outro agendamento.',
  },
  {
    n: '05',
    h: 'Pronto em minutos',
    p: 'Conecta o WhatsApp, cadastra os serviços e já está atendendo.',
  },
];

export function Differentiators() {
  return (
    <section id="diferenciais" className="py-24">
      <Container>
        <SectionHeading
          eyebrow="Por que o Demandaê"
          title="Cinco motivos pra largar a agenda de papel."
        >
          Não é mais um chatbot de botãozinho. É um atendente que conversa de verdade e cuida da sua
          agenda pra você.
        </SectionHeading>
        <div className="grid gap-px overflow-hidden rounded-3xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-5">
          {diffs.map((d) => (
            <div key={d.n} className="bg-paper p-8 transition-colors hover:bg-cream-2">
              <div className="mb-3.5 font-serif text-[2.4rem] font-black leading-none text-coral">
                {d.n}
              </div>
              <h3 className="mb-2 text-[1.05rem] font-bold">{d.h}</h3>
              <p className="text-sm leading-relaxed text-ink-soft">{d.p}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
