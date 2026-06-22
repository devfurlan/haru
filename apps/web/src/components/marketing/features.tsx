import { cn } from '@/lib/utils';

import { Container } from './container';
import { SectionHeading } from './section-heading';

function FeatureCard({
  kicker,
  title,
  items,
  className,
  style,
  kickerClass = 'text-green-bright',
  checkClass = 'text-green-bright',
  children,
}: {
  kicker: string;
  title: string;
  items: string[];
  className?: string;
  style?: React.CSSProperties;
  kickerClass?: string;
  checkClass?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      style={style}
      className={cn(
        'relative overflow-hidden rounded-[18px] border border-white/[0.07] bg-ink-soft p-8 transition-transform duration-300 hover:-translate-y-1 hover:border-green-bright/40',
        className,
      )}
    >
      <span
        className={cn('mb-3.5 block text-[0.74rem] font-bold uppercase tracking-[0.12em]', kickerClass)}
      >
        {kicker}
      </span>
      <h3 className="mb-3 font-serif text-2xl font-semibold tracking-[-0.01em]">{title}</h3>
      <ul className="flex flex-col gap-2.5">
        {items.map((it) => (
          <li key={it} className="flex gap-2.5 text-[0.95rem] leading-snug text-cream/85">
            <span className={cn('mt-0.5 shrink-0 font-extrabold', checkClass)}>✓</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
      {children}
    </div>
  );
}

export function Features() {
  return (
    <section id="recursos" className="bg-ink py-24 text-cream">
      <Container>
        <SectionHeading
          dark
          eyebrow="Tudo que já funciona"
          title="Um atendente no WhatsApp e um painel pra você comandar."
        >
          Recursos disponíveis hoje - sem promessa pra depois.
        </SectionHeading>

        <div className="grid gap-4 lg:grid-cols-12">
          <FeatureCard
            className="lg:col-span-7"
            style={{ backgroundImage: 'linear-gradient(160deg,#163a29,#0e2a1d)' }}
            kicker="Atendente de IA no WhatsApp"
            title="Conversa, agenda e resolve sozinho"
            items={[
              'Agendamento 100% conversacional, conduzido por IA que entende linguagem natural',
              'Mostra o menu de serviços no chat, com preço e duração, pra escolher mais rápido',
              'Cobra na própria conversa: Pix copia-e-cola ou link de cartão logo após agendar',
              'Confirma o pagamento sozinho no chat assim que o valor cai',
              'O cliente cancela e remarca sozinho pelo chat, a qualquer hora',
              'Tira dúvidas de serviços, preços e horários automaticamente',
              'Entende áudios: transcreve a mensagem de voz e responde',
              'Agrupa mensagens em rajada ("oi" · "tudo bem?" · "queria agendar") num só atendimento',
              'Valida a disponibilidade: respeita o expediente e nunca marca em cima',
              'Tom cordial e brasileiro, sem parecer robô',
            ]}
          />

          <FeatureCard
            className="lg:col-span-5"
            kicker="Lembretes automáticos"
            title="Cadeira vazia dói no bolso"
            items={[
              'Lembrete via WhatsApp X horas antes do horário - você define quantas',
              'Quer desligar? É só colocar 0. Simples assim',
              'Reduz faltas sem você precisar mandar mensagem na mão',
            ]}
          />

          <FeatureCard
            className="lg:col-span-7"
            kicker="Painel de gestão (web)"
            title="A visão completa do seu dia"
            items={[
              'Dashboard com os agendamentos de hoje, os próximos 7 dias e os serviços ativos',
              'Cadastro de serviços com nome, descrição, duração e preço',
              'Horários por dia da semana, inclusive expediente partido (08–12h e 14–18h)',
              'Agenda completa: crie e remarque agendamentos manualmente',
              'Controle de presença: marque "atendido" ou "não compareceu" e acompanhe as faltas',
              'Caixa de conversas com o histórico de cada cliente, estilo WhatsApp',
              'Página pública /seunegocio com serviços, horários e botão "Agendar pelo WhatsApp"',
            ]}
          />

          <FeatureCard
            className="lg:col-span-5"
            style={{ backgroundImage: 'linear-gradient(160deg,#2a1b12,#1c130c)' }}
            kickerClass="text-coral-soft"
            checkClass="text-coral-soft"
            kicker="Integrações"
            title="Conecta no seu fluxo"
            items={[
              'Onboarding do WhatsApp oficial (Meta) com o número próprio do seu negócio',
              'Webhooks: todo agendamento criado, cancelado ou remarcado dispara um aviso',
            ]}
          >
            <div className="mt-4 flex flex-wrap gap-2">
              {['Discord', 'Slack', 'Zapier', 'n8n'].map((chip) => (
                <span
                  key={chip}
                  className="rounded-lg border border-white/10 bg-white/[0.08] px-3 py-1.5 text-[0.82rem] font-semibold"
                >
                  {chip}
                </span>
              ))}
            </div>
          </FeatureCard>
        </div>
      </Container>
    </section>
  );
}
