import { Container } from './container';

const diffs = [
  {
    num: '01',
    titulo: 'Plataforma completa',
    texto:
      'App do cliente, página web pública e painel do dono - integrados de fábrica, não colados depois.',
  },
  {
    num: '02',
    titulo: 'O cliente escolhe o canal',
    texto:
      'App ou web, tanto faz. Cada cliente agenda do jeito que prefere, e você não perde nenhum.',
  },
  {
    num: '03',
    titulo: 'WhatsApp caiu? Você continua',
    texto:
      'O WhatsApp é só o mensageiro. Se a Meta tiver um dia ruim, sua agenda, sua página e seu app seguem de pé.',
  },
  {
    num: '04',
    titulo: 'Sua marca, sem marketplace',
    texto:
      'Sua página, seu link, seus clientes. Sem vitrine com o concorrente do lado oferecendo desconto.',
  },
  {
    num: '05',
    titulo: 'Configura em minutos',
    texto:
      'Cadastra os serviços, define os horários, compartilha o link. Sem consultor, sem manual de 40 páginas.',
  },
];

export function Differentiators() {
  return (
    <section className="bg-cream">
      <Container className="py-24">
        <div className="mb-[52px] max-w-[620px]">
          <div className="text-sub mb-4 text-[0.72rem] font-bold uppercase tracking-[0.15em]">
            Por que Demandaê
          </div>
          <h2 className="font-serif text-[clamp(2rem,4vw,2.6rem)] font-medium leading-[1.08] tracking-[-0.02em]">
            O que a gente faz <em className="font-normal italic">diferente.</em>
          </h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {diffs.map((d) => (
            <div
              key={d.num}
              className="bg-paper border-edge hover:border-green-deep rounded-[20px] border p-7 transition-colors"
            >
              <div className="text-green-deep mb-2.5 font-serif text-2xl font-semibold">
                {d.num}
              </div>
              <div className="mb-2 font-serif text-[1.2rem] font-semibold">{d.titulo}</div>
              <p className="text-ink-70 text-[0.9rem] leading-[1.55]">{d.texto}</p>
            </div>
          ))}
          <div
            className="bg-green-deep flex flex-col justify-center rounded-[20px] p-7"
            style={{
              backgroundImage:
                'radial-gradient(280px 160px at 90% -20%, rgba(47,211,122,.16), transparent)',
            }}
          >
            <div className="text-cream mb-2.5 font-serif text-[1.4rem] leading-[1.3]">
              Mercado cheio de bot de WhatsApp. <em className="italic">A gente foi por outro caminho.</em>
            </div>
            <p className="text-on-emerald-mut text-[0.9rem] leading-[1.55]">
              Plataforma primeiro, canal depois. Seu negócio não pode depender do servidor da Meta
              pra funcionar.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
