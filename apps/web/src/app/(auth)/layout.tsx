import Link from 'next/link';

import { Logo } from '@/components/logo';

// Shell das telas de auth (login/cadastro/recuperação), compartilhado por dono e cliente.
// Split: painel esmeralda com a proposta da marca à esquerda (desktop), formulário
// direto sobre o creme à direita (sem card). Cada página traz seu próprio título/form.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-wrap items-stretch">
      {/* painel esmeralda */}
      <div className="text-on-emerald hidden flex-[1.1] flex-col justify-between px-12 py-11 [background:radial-gradient(720px_380px_at_18%_-10%,rgba(47,211,122,.15),transparent_62%),radial-gradient(620px_460px_at_88%_112%,rgba(255,90,54,.12),transparent_60%),var(--emerald)] md:flex">
        <Link href="/" aria-label="Demandaê" className="text-cream self-start no-underline">
          <Logo color="coral" size="md" />
        </Link>
        <div className="max-w-[440px] py-10">
          <div className="text-on-emerald-mut mb-3.5 text-[11px] font-bold uppercase tracking-[0.14em]">
            Painel do estabelecimento
          </div>
          <div className="font-serif text-[38px] leading-[1.14] tracking-tight">
            Sua agenda trabalhando <em className="text-green-bright">sozinha</em>, o dia inteiro.
          </div>
          <p className="text-on-emerald-mut mt-4 text-[15px] leading-relaxed">
            Seus clientes marcam pelo app ou pela sua página na web. Você acompanha tudo por aqui -
            e confirmação e lembrete chegam sozinhos.
          </p>
        </div>
        <div className="text-on-emerald-mut flex items-center gap-2 text-[12.5px] font-medium">
          <span className="bg-green-bright animate-pulse-ring size-2 rounded-full" />
          Agenda aberta pros seus clientes 24h por dia
        </div>
      </div>

      {/* formulário */}
      <div className="bg-cream flex flex-1 items-center justify-center px-6 py-11">
        <div className="w-full max-w-[390px]">
          <Link href="/" aria-label="Demandaê" className="mb-6 inline-flex md:hidden">
            <Logo size="md" />
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}
