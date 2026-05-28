import { Container } from './container';
import { SectionHeading } from './section-heading';

const steps = [
  {
    h: 'Conecte o WhatsApp',
    p: 'Onboarding oficial da Meta com o número do seu próprio negócio. Sem chip novo, sem gambiarra.',
  },
  {
    h: 'Cadastre seus serviços',
    p: 'Nome, duração, preço e seus horários de atendimento. A IA já passa a usar tudo isso na conversa.',
  },
  {
    h: 'Deixa a IA atender',
    p: 'Seu cliente conversa, agenda e recebe lembrete. Você acompanha tudo pelo painel.',
  },
];

export function HowItWorks() {
  return (
    <section id="como" className="py-24">
      <Container>
        <SectionHeading
          eyebrow="Pronto em minutos"
          title="Três passos e seu WhatsApp vira recepção."
        />
        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <div
              key={s.h}
              className="relative rounded-2xl border border-border bg-paper p-8 pt-9 shadow-sm"
            >
              <div className="absolute -top-[18px] left-7 grid h-[42px] w-[42px] place-items-center rounded-xl bg-green font-serif text-xl font-black text-cream shadow-soft">
                {i + 1}
              </div>
              <h3 className="mb-2 mt-3.5 text-xl font-bold">{s.h}</h3>
              <p className="text-[0.97rem] text-ink-soft">{s.p}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
