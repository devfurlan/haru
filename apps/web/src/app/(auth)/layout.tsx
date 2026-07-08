import Link from 'next/link';

import { Logo } from '@/components/logo';

const PANEL_BG =
  'radial-gradient(720px 380px at 18% -10%, rgba(47,211,122,.15), transparent 62%), radial-gradient(620px 460px at 88% 112%, rgba(255,90,54,.12), transparent 60%), var(--emerald)';

// Shell das telas de auth (login/cadastro/recuperação), compartilhado por dono e cliente.
// Split: painel esmeralda com a proposta da marca à esquerda (desktop), formulário
// em card creme à direita. Cada página traz seu próprio título/form dentro do card.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-wrap items-stretch">
      {/* painel esmeralda */}
      <div
        className="hidden flex-[1.1] flex-col justify-between px-12 py-11 text-on-emerald md:flex"
        style={{ background: PANEL_BG }}
      >
        <Link href="/" aria-label="Demandaê" className="self-start text-cream no-underline">
          <Logo color="coral" size="md" />
        </Link>
        <div className="max-w-[440px] py-10">
          <div className="mb-3.5 text-[11px] font-bold uppercase tracking-[0.14em] text-on-emerald-mut">
            Painel do estabelecimento
          </div>
          <div className="font-serif text-[38px] leading-[1.14] tracking-tight">
            Sua agenda trabalhando <em className="text-green-bright">sozinha</em>, o dia inteiro.
          </div>
          <p className="mt-4 text-[15px] leading-relaxed text-on-emerald-mut">
            Seus clientes marcam pelo app ou pela sua página na web. Você acompanha tudo por aqui - e
            confirmação e lembrete chegam sozinhos.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[12.5px] font-medium text-on-emerald-mut">
          <span className="size-2 rounded-full bg-green-bright animate-pulse-ring" />
          Agenda aberta pros seus clientes 24h por dia
        </div>
      </div>

      {/* formulário */}
      <div className="flex flex-1 items-center justify-center bg-cream px-6 py-11">
        <div className="w-full max-w-[390px]">
          <Link href="/" aria-label="Demandaê" className="mb-6 inline-flex md:hidden">
            <Logo size="md" />
          </Link>
          <div className="rounded-[22px] border border-line bg-paper p-7 shadow-soft">{children}</div>
        </div>
      </div>
    </div>
  );
}
