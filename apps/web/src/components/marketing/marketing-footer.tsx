import Link from 'next/link';

import { Logo } from '@/components/logo';

// Rodapé em 3 colunas (layout da home antiga). Os destinos NÃO são os do rodapé antigo:
// ele apontava pra âncoras da home velha que não existem mais (#cliente, #recursos,
// #planos), então "Recursos"/"Planos" vão pras páginas reais e as duas âncoras que
// sobraram (#como-funciona, #faq) têm id declarado nas seções correspondentes.
const columns = [
  {
    title: 'Produto',
    links: [
      { href: '/#como-funciona', label: 'Como funciona' },
      { href: '/funcionalidades', label: 'Recursos' },
      { href: '/precos', label: 'Planos' },
    ],
  },
  {
    title: 'Conta',
    links: [
      { href: '/login', label: 'Entrar' },
      { href: '/signup', label: 'Criar conta' },
      { href: '/#faq', label: 'Dúvidas frequentes' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/termos', label: 'Termos de uso' },
      { href: '/privacidade', label: 'Privacidade' },
      { href: '/cookies', label: 'Cookies' },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer className="bg-[#04120c]">
      <div className="mx-auto max-w-[1200px] px-[clamp(20px,5vw,40px)] pb-10 pt-[clamp(48px,6vw,64px)]">
        <div className="border-b-on-emerald-mut/15 flex flex-wrap justify-between gap-12 border-b pb-12">
          <div className="max-w-[280px]">
            {/* color="coral" = bolinha E "ê" em coral (o prop controla os dois). Não usar
                "cream" aqui: o wordmark já é creme, então o acento da marca sumiria. */}
            <Logo color="coral" className="text-cream mb-3.5 text-xl" />
            <p className="text-on-emerald-faint font-sans text-[14px] font-normal leading-[1.5]">
              Sua agenda, sem enrolação. Plataforma brasileira de agendamento pra negócios de
              serviço.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-16 gap-y-8">
            {columns.map((col) => (
              <div key={col.title} className="flex flex-col gap-2.5">
                <div className="text-on-emerald-faint mb-1 font-sans text-[11px] font-bold uppercase leading-[normal] tracking-[.14em]">
                  {col.title}
                </div>
                {col.links.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    // `!` obrigatório: `.dmd-home a { color: inherit }` (globals.css) é regra
                    // SEM camada e vence qualquer `@layer utilities`, independente de
                    // especificidade. Sem o `!` o link herda o ink do body e some no fundo
                    // escuro. Idem `dmd-btn` em home/btn.tsx.
                    className="hv-green text-on-emerald! font-sans text-[14px] font-medium leading-[normal]"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="text-on-emerald-faint flex flex-wrap justify-between gap-x-6 gap-y-2 pt-6 font-sans text-[12.5px] font-normal leading-[normal]">
          <span>© {new Date().getFullYear()} Demandaê · Sua agenda, sem enrolação.</span>
          <span>Feito no Brasil · Dados protegidos pela LGPD · Infraestrutura em nuvem</span>
        </div>
      </div>
    </footer>
  );
}
