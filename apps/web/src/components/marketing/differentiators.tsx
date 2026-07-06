import { Container } from './container';
import { SectionHeading } from './section-heading';

const diffs = [
  {
    n: '01',
    h: 'Plataforma completa',
    p: 'App do cliente, página pública e painel num produto só. Não é um bot solto no WhatsApp - é a sua operação inteira.',
  },
  {
    n: '02',
    h: 'O cliente escolhe o canal',
    p: 'App ou web: ele agenda por onde preferir e nunca fica preso a um só. O WhatsApp confirma e lembra - e, com o Atendente IA, também conversa e agenda.',
  },
  {
    n: '03',
    h: 'Você comanda tudo',
    p: 'Todo agendamento, de todo canal, numa agenda só. Você vê o dia inteiro, a equipe e as faltas num lugar.',
  },
  {
    n: '04',
    h: 'Menos faltas, sem esforço',
    p: 'Confirmação e lembrete automáticos no WhatsApp reduzem o no-show sem você precisar lembrar de nada.',
  },
  {
    n: '05',
    h: 'Comece em minutos',
    p: 'Cadastra os serviços, publica sua página e já está atendendo. Sem taxa de instalação no plano base.',
  },
];

export function Differentiators() {
  return (
    <section id="diferenciais" className="py-24">
      <Container>
        <SectionHeading
          eyebrow="Por que o Demandaê"
          title="Cinco motivos pra sair da agenda de papel."
        >
          Não é mais um bot no WhatsApp. É a plataforma que junta app, web e painel - e põe você no
          comando de tudo.
        </SectionHeading>
        <div className="border-border bg-border grid gap-px overflow-hidden rounded-3xl border sm:grid-cols-2 lg:grid-cols-5">
          {diffs.map((d) => (
            <div key={d.n} className="bg-paper hover:bg-cream-2 p-8 transition-colors">
              <div className="text-coral mb-3.5 font-serif text-[2.4rem] font-black leading-none">
                {d.n}
              </div>
              <h3 className="mb-2 text-[1.05rem] font-bold">{d.h}</h3>
              <p className="text-ink-soft text-sm leading-relaxed">{d.p}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
