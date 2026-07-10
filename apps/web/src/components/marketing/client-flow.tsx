import { Globe, MessageCircle, Smartphone } from 'lucide-react';

import { Container } from './container';
import { SectionHeading } from './section-heading';

const channels = [
  {
    Icon: Smartphone,
    tag: 'App',
    title: 'Pelo app do Demandaê',
    text: 'Baixa grátis, agenda em segundos e guarda o histórico. Recebe lembrete no push e salva o horário na agenda do celular.',
  },
  {
    Icon: Globe,
    tag: 'Web pública',
    title: 'Pela sua página /seunegocio',
    text: 'Um link só pra colar no Instagram e no story. Quem clica agenda na hora, sem baixar nada e sem criar conta.',
  },
  {
    Icon: MessageCircle,
    tag: 'WhatsApp',
    title: 'Conversando no WhatsApp',
    text: 'Em breve: com o addon Atendente IA, o cliente vai poder só mandar mensagem - a IA entende, mostra os horários e marca ali mesmo.',
    accent: true,
    soon: true,
  },
];

export function ClientFlow() {
  return (
    <section id="como-cliente" className="py-24">
      <Container>
        <SectionHeading eyebrow="Pro seu cliente" title="Cada cliente agenda do jeito que já usa.">
          App e web hoje, WhatsApp em breve - seu cliente escolhe o canal e não fica preso a nenhum.
          O agendamento cai sempre direto na mesma agenda.
        </SectionHeading>

        <div className="grid gap-4 md:grid-cols-3">
          {channels.map((c) => (
            <div
              key={c.title}
              className="border-border bg-paper relative flex flex-col rounded-2xl border p-7 shadow-sm"
            >
              {c.soon && (
                <span className="bg-coral/10 text-coral absolute right-4 top-4 rounded-full px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.1em]">
                  Em breve
                </span>
              )}
              <span
                className={`grid h-11 w-11 place-items-center rounded-xl ${
                  c.accent ? 'bg-coral/10 text-coral' : 'bg-chip text-green'
                }`}
              >
                <c.Icon className="size-5" aria-hidden />
              </span>
              <span
                className={`mt-4 text-[0.68rem] font-bold uppercase tracking-[0.12em] ${
                  c.accent ? 'text-coral' : 'text-green'
                }`}
              >
                {c.tag}
              </span>
              <h3 className="mt-1.5 font-serif text-xl font-semibold tracking-[-0.01em]">
                {c.title}
              </h3>
              <p className="text-ink-soft mt-2 text-[0.97rem] leading-relaxed">{c.text}</p>
            </div>
          ))}
        </div>

        <p className="text-ink-soft mt-8 text-center text-sm">
          Comece por um canal, troque quando quiser - o histórico do cliente é sempre o mesmo.
        </p>
      </Container>
    </section>
  );
}
