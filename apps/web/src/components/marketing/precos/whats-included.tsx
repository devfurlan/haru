const CARDS = [
  {
    title: 'Agenda que não trava',
    desc: 'Rápida, leve, feita pra abrir no meio do corte. Sem tela branca, sem esperar carregar.',
    icon: (
      <>
        <rect x="3" y="4" width="18" height="18" rx="2.5" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <path d="m8.5 16 2 2 4-4" />
      </>
    ),
  },
  {
    title: 'App do cliente com a sua marca',
    desc: 'Seu cliente agenda pelo app ou pela página web. Nada de marketplace com a barbearia da esquina do lado.',
    icon: (
      <>
        <rect x="5" y="2" width="14" height="20" rx="2.6" />
        <line x1="10" y1="18.5" x2="14" y2="18.5" />
      </>
    ),
  },
  {
    title: 'Programa de fidelidade',
    desc: 'Pontos, recompensas e retorno automático. Já incluso, em todos os planos.',
    icon: (
      <>
        <circle cx="12" cy="8" r="6" />
        <path d="M8.2 13.2 7 22l5-3 5 3-1.2-8.8" />
      </>
    ),
  },
  {
    title: 'Clube de assinatura',
    desc: 'Receita recorrente todo mês. Seu cliente assina o corte, você para de depender de agenda cheia.',
    icon: (
      <>
        <path d="m17 2 4 4-4 4" />
        <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
        <path d="m7 22-4-4 4-4" />
        <path d="M21 13v1a4 4 0 0 1-4 4H3" />
      </>
    ),
  },
  {
    title: 'Pagamentos online',
    desc: 'Cobre antes, reduza no-show. Tudo dentro da plataforma.',
    icon: (
      <>
        <rect x="2" y="5" width="20" height="14" rx="2.5" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </>
    ),
  },
  {
    title: 'Funciona mesmo se o WhatsApp cair',
    desc: 'Seu agendamento não depende da Meta. Se der problema lá fora, aqui continua rodando.',
    icon: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
  },
];

export function WhatsIncluded() {
  return (
    <section id="recursos" className="bg-green-deep relative mt-[60px] overflow-hidden py-[88px]">
      <div className="pointer-events-none absolute left-[12%] top-[-80px] h-[360px] w-[360px] bg-[radial-gradient(circle,rgba(47,211,122,.16),transparent_70%)]" />
      <div className="pointer-events-none absolute bottom-[-100px] right-[8%] h-[420px] w-[420px] bg-[radial-gradient(circle,rgba(255,90,54,.1),transparent_70%)]" />
      <div className="relative mx-auto max-w-[1120px] px-[clamp(20px,5vw,40px)]">
        <div className="mb-[52px] text-center">
          <div className="mb-[14px] inline-flex items-center gap-[9px]">
            <span className="bg-coral h-[2px] w-[20px] rounded-[2px]" />
            <span className="text-green-bright font-sans text-[11px] font-bold uppercase leading-[normal] tracking-[.16em]">
              O que vem junto
            </span>
          </div>
          <h2 className="text-on-emerald mx-auto mb-[14px] max-w-[720px] font-serif text-[clamp(28px,5vw,42px)] font-normal leading-[1.1] tracking-[-.02em]">
            Não é só agenda. É a <span className="text-green-bright italic">operação inteira</span>.
          </h2>
          <p className="text-on-emerald-mut mx-auto max-w-[620px] font-sans text-[17px] font-normal leading-[1.55]">
            Recursos que outros sistemas vendem separado, cobram à parte ou simplesmente não têm.
          </p>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-[20px]">
          {CARDS.map((c) => (
            <div
              key={c.title}
              className="bg-green-card rounded-[22px] border border-[rgba(143,191,164,.16)] px-[28px] py-[30px]"
            >
              <span className="mb-[18px] flex h-[50px] w-[50px] items-center justify-center rounded-[var(--radius-icontile)] bg-[rgba(47,211,122,.14)]">
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#2FD37A"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {c.icon}
                </svg>
              </span>
              <div className="text-on-emerald mb-[9px] font-serif text-[20px] font-medium leading-[1.2]">
                {c.title}
              </div>
              <div className="text-on-emerald-mut font-sans text-[14.5px] font-normal leading-[1.6]">
                {c.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
