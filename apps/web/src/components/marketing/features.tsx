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
  badge,
  children,
}: {
  kicker: string;
  title: string;
  items: string[];
  className?: string;
  style?: React.CSSProperties;
  kickerClass?: string;
  checkClass?: string;
  badge?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      style={style}
      className={cn(
        'bg-ink-soft hover:border-green-bright/40 relative overflow-hidden rounded-[18px] border border-white/[0.07] p-8 transition-transform duration-300 hover:-translate-y-1',
        className,
      )}
    >
      {badge && (
        <span className="bg-coral/15 text-coral-soft absolute right-5 top-6 rounded-full px-2.5 py-1 text-[0.66rem] font-bold uppercase tracking-[0.1em]">
          {badge}
        </span>
      )}
      <span
        className={cn(
          'mb-3.5 block text-[0.74rem] font-bold uppercase tracking-[0.12em]',
          kickerClass,
        )}
      >
        {kicker}
      </span>
      <h3 className="mb-3 font-serif text-2xl font-semibold tracking-[-0.01em]">{title}</h3>
      <ul className="flex flex-col gap-2.5">
        {items.map((it) => (
          <li key={it} className="text-cream/85 flex gap-2.5 text-[0.95rem] leading-snug">
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
    <section id="recursos" className="bg-ink text-cream py-24">
      <Container>
        <SectionHeading
          dark
          eyebrow="A plataforma"
          title="Muito mais que um chatbot: a sua agenda inteira, de ponta a ponta."
        >
          App, web e painel trabalhando junto - tudo que já está no ar, sem promessa pra depois.
        </SectionHeading>

        <div className="grid gap-4 lg:grid-cols-12">
          <FeatureCard
            className="lg:col-span-7"
            style={{ backgroundImage: 'linear-gradient(160deg,#163a29,#0e2a1d)' }}
            kicker="App do cliente + área logada"
            title="Seu negócio no bolso do cliente"
            items={[
              'App grátis onde o cliente agenda, remarca e cancela sozinho, a qualquer hora',
              'Área logada com todo o histórico de atendimentos e os próximos horários',
              'Lembrete no push e um toque pra salvar o horário na agenda do celular',
              'Busca por proximidade (GPS): quem está perto encontra seu negócio',
              'Favoritos e "volte pra": o cliente reagenda com você em dois toques',
            ]}
          />

          <FeatureCard
            className="lg:col-span-5"
            kicker="Página pública"
            title="Um link /seunegocio pra divulgar"
            items={[
              'Página própria de agendamento, no ar em minutos, sem você programar nada',
              'Cola na bio do Instagram e no story: quem clica agenda sem baixar app',
              'Mostra serviços, preços e horários livres, com a cara do seu negócio',
            ]}
          />

          <FeatureCard
            className="lg:col-span-5"
            kicker="Agenda inteligente"
            title="Nunca marca em cima"
            items={[
              'Respeita seu expediente, inclusive partido (08–12h e 14–18h)',
              'Valida a disponibilidade em tempo real: dois clientes nunca pegam o mesmo horário',
              'Agenda recorrente: semanal, quinzenal ou mensal marcada de uma vez',
              'Cada profissional com a própria agenda, serviços e horários',
            ]}
          />

          <FeatureCard
            className="lg:col-span-7"
            kicker="Painel de gestão (web)"
            title="A visão completa do seu dia"
            items={[
              'Dashboard com os agendamentos de hoje, os próximos 7 dias e os serviços ativos',
              'Controle de presença: marque "atendido" ou "não compareceu" e acompanhe as faltas',
              'Cadastro de serviços com nome, descrição, duração e preço',
              'Equipe: cada profissional com sua agenda; crie e remarque manualmente',
              'Caixa de conversas com o histórico de cada cliente, estilo WhatsApp',
            ]}
          />

          <FeatureCard
            className="lg:col-span-4"
            kicker="Lembretes automáticos"
            title="Cadeira vazia dói no bolso"
            items={[
              'Lembrete X horas antes - por WhatsApp, e-mail e push no app',
              'Você define quantas horas antes; pra desligar, é só colocar 0',
              'Reduz falta sem você mandar nada na mão',
            ]}
          />

          <FeatureCard
            className="lg:col-span-4"
            style={{ backgroundImage: 'linear-gradient(160deg,#2a1b12,#1c130c)' }}
            kickerClass="text-coral-soft"
            checkClass="text-coral-soft"
            badge="Time+"
            kicker="Pagamentos online"
            title="Receba na hora de marcar"
            items={[
              'Pix copia-e-cola ou link de cartão na conversa e no app',
              'Confirma o pagamento sozinho assim que o valor cai',
              'Menos furo de horário: quem paga, aparece',
            ]}
          />

          <FeatureCard
            className="lg:col-span-4"
            style={{ backgroundImage: 'linear-gradient(160deg,#2a1b12,#1c130c)' }}
            kickerClass="text-coral-soft"
            checkClass="text-coral-soft"
            badge="Time+"
            kicker="Integrações"
            title="Conecta no seu fluxo"
            items={[
              'WhatsApp oficial (Meta) com o número próprio do seu negócio',
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
