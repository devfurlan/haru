import { BellRing, LayoutDashboard, Sparkles } from 'lucide-react';

import { Container } from './container';
import { InterestDialog } from './interest-dialog';
import { SectionHeading } from './section-heading';

const items = [
  {
    Icon: LayoutDashboard,
    title: 'Um painel só, com tudo',
    text: 'Agendamentos do app e da web caem na mesma agenda. Você acompanha o dia, a equipe e a presença sem planilha nem app paralelo.',
  },
  {
    Icon: BellRing,
    title: 'Confirmação e lembrete sozinhos',
    text: 'O WhatsApp confirma o horário e manda o lembrete antes - reduz falta sem você mexer um dedo. Já vem no plano base, sem custo extra.',
  },
  {
    Icon: Sparkles,
    title: 'Atendente IA (em breve)',
    text: 'Logo o cliente também vai poder conversar e agendar pelo WhatsApp com IA - opcional, liga e desliga quando fizer sentido.',
    accent: true,
  },
];

export function OwnerFlow() {
  return (
    <section id="como-voce" className="py-24">
      <Container>
        <SectionHeading
          eyebrow="Pra você (dono)"
          title="Vários canais entrando. Um lugar pra comandar."
        >
          Não importa por onde o cliente marcou - você vê tudo no mesmo painel e deixa o WhatsApp
          cuidar dos avisos por você.
        </SectionHeading>

        <div className="grid gap-4 md:grid-cols-3">
          {items.map((it) => (
            <div
              key={it.title}
              className="border-border bg-paper flex flex-col rounded-2xl border p-7"
            >
              <span
                className={`grid h-11 w-11 place-items-center rounded-xl ${
                  it.accent ? 'bg-coral/10 text-coral' : 'bg-chip text-green'
                }`}
              >
                <it.Icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-4 font-serif text-xl font-semibold tracking-[-0.01em]">
                {it.title}
              </h3>
              <p className="text-ink-soft mt-2 text-[0.97rem] leading-relaxed">{it.text}</p>
              {it.accent && (
                <InterestDialog
                  title="Lista de espera do Atendente IA"
                  description="O Atendente IA no WhatsApp está a caminho. Deixe seus dados que a gente avisa assim que abrir - e você entra na frente."
                >
                  <button
                    type="button"
                    className="text-coral mt-4 text-left text-sm font-semibold underline-offset-4 hover:underline"
                  >
                    Entrar na lista de espera →
                  </button>
                </InterestDialog>
              )}
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
