import type { ReactNode } from 'react';

/* Faixa de garantias. NÃO é seção própria: vive dentro da de preços (pricing-preview.tsx),
   logo abaixo dos cards, porque são ganchos pra fechar a assinatura - perto do CTA, não a
   uma rolada de distância. Por isso o tratamento é discreto: os 5 numa linha só, ícone
   pequeno sem tile, fonte de UI (não display), direto sobre o fundo da seção. */

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--emerald)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="block"
      aria-hidden
    >
      {children}
    </svg>
  );
}

const ITEMS: { title: string; body: string; icon: ReactNode }[] = [
  {
    title: 'Garantia de 30 dias',
    body: 'Não curtiu? Devolução integral, sem perguntinha chata.',
    icon: (
      <Icon>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        <path d="m9 12 2 2 4-4" />
      </Icon>
    ),
  },
  {
    title: 'Sem taxa de instalação',
    body: 'Você paga a mensalidade e mais nada.',
    icon: (
      <Icon>
        <path d="M9 14l6-6" />
        <circle cx="9.5" cy="8.5" r="1.2" />
        <circle cx="14.5" cy="13.5" r="1.2" />
        <path d="M7 4h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3z" />
        <line x1="4" y1="4" x2="20" y2="20" />
      </Icon>
    ),
  },
  {
    title: 'Cancele quando quiser',
    body: 'Um clique, sem multa, sem fidelidade escondida.',
    icon: (
      <Icon>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </Icon>
    ),
  },
  {
    title: 'Suporte de gente, em português',
    body: 'Fala direto com o fundador pelo WhatsApp. Sem robô.',
    icon: (
      <Icon>
        <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 17 0Z" />
        <path d="m9 11 2 2 4-4" />
      </Icon>
    ),
  },
  {
    title: 'LGPD e nuvem',
    body: 'Dados dos seus clientes protegidos, infraestrutura com backup.',
    icon: (
      <Icon>
        <rect x="4" y="10" width="16" height="11" rx="2.4" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        <circle cx="12" cy="15.5" r="1.3" />
      </Icon>
    ),
  },
];

export function Guarantees() {
  return (
    // minmax(180px) + gap-x-6 cabe exatamente 5 trilhas nos 1040px de conteúdo (max-w 1120
    // menos 2x40 de padding) e nenhuma a mais; abaixo disso degrada sozinho (4+1, 3+2,
    // 2+2+1, empilhado) sem media query. O minmax é quem segura isso: com flex os itens não
    // quebram e estouram o viewport no mobile. Pra subir o gap-x, baixe o minmax junto -
    // 5x190+4x24 = 1046 > 1040 e o 5º cai pra linha de baixo.
    <div className="border-t-green-deep/10 mt-[clamp(26px,3.4vw,38px)] grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-x-6 gap-y-5 border-t pt-[clamp(24px,3vw,32px)]">
      {ITEMS.map((it) => (
        <div key={it.title}>
          {it.icon}
          {/* 2 linhas de título fixas: "Suporte de gente, em português" quebra e sem isso
              as 5 descrições desalinhavam entre si. */}
          <div className="text-green-deep mt-2.5 min-h-[34px] font-sans text-[13px] font-semibold leading-[1.3]">
            {it.title}
          </div>
          <div className="text-ink-70 mt-1 font-sans text-[12px] font-normal leading-[1.45]">
            {it.body}
          </div>
        </div>
      ))}
    </div>
  );
}
