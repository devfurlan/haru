import { ChevronDown } from 'lucide-react';

import { Container } from './container';
import { SectionHeading } from './section-heading';

const faqs = [
  {
    q: 'Preciso do WhatsApp Business API?',
    a: 'Só se você ativar o addon Atendente IA - e mesmo assim a gente configura tudo pra você. No plano base, as confirmações e lembretes saem pelo WhatsApp sem nenhuma configuração da sua parte.',
  },
  {
    q: 'E se meu negócio crescer?',
    a: 'Muda de plano quando quiser, sem fricção. O upgrade é imediato e você só paga a diferença.',
  },
  {
    q: 'Posso testar antes de pagar?',
    a: 'Você tem 30 dias de garantia total. Se não curtir, devolvemos 100% do valor.',
  },
  {
    q: 'Como cancelo?',
    a: 'Um clique no painel, sem multa e sem fidelidade.',
  },
  {
    q: 'O plano tem taxa de instalação?',
    a: 'Não. Você entra direto, sem taxa de entrada. A única exceção é o addon Atendente IA no WhatsApp, que tem um setup único - ele paga a configuração da sua conta oficial na Meta.',
  },
  {
    q: 'E se eu passar do limite de agendamentos?',
    a: 'Avisamos com antecedência (85%, 90% e 95%) pra você fazer upgrade - nunca bloqueamos o seu cliente final.',
  },
];

export function PrecosFaq() {
  return (
    <section id="faq" className="py-24">
      <Container>
        <SectionHeading eyebrow="Dúvidas" title="Perguntas frequentes." />
        <div className="divide-border border-border bg-paper mx-auto max-w-[760px] divide-y rounded-3xl border">
          {faqs.map(({ q, a }) => (
            <details key={q} className="group px-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-semibold [&::-webkit-details-marker]:hidden">
                {q}
                <ChevronDown
                  aria-hidden
                  className="text-ink-soft size-5 shrink-0 transition-transform group-open:rotate-180"
                />
              </summary>
              <p className="text-ink-soft pb-5 text-[0.98rem] leading-relaxed">{a}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
