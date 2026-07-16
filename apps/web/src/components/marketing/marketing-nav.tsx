'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { Logo } from '@/components/logo';
import { cn } from '@/lib/utils';

import { Btn } from './home/btn';

// As landings por nicho existem desde sempre e não eram linkadas de lugar NENHUM -
// só quem já sabia a URL chegava nelas. O menu é o caminho de descoberta e o link
// interno que o SEO delas precisa. Landing nova = uma linha aqui (e o slug em
// RESERVED_SLUGS, ver nicho/content.tsx).
const NICHES = [
  { href: '/barbearia', label: 'Barbearia' },
  { href: '/salao', label: 'Salão de beleza' },
  { href: '/clinica-estetica', label: 'Clínica de estética' },
  { href: '/estetica', label: 'Estética e spa' },
  { href: '/podologia', label: 'Podologia' },
];

// Só páginas reais. O menu antigo tinha "Diferenciais" (âncora da home) e "Em breve"
// (âncora de roadmap dentro de /funcionalidades): de /precos os dois te chutavam pra
// fora da página, e roadmap não é destino de menu. As duas seções continuam vivas,
// alcançáveis rolando a home e /funcionalidades.
const LINKS = [
  { href: '/funcionalidades', label: 'Funcionalidades' },
  { href: '/precos', label: 'Preços' },
];

// `text-*!` obrigatório: `.dmd-home a { color: inherit }` mora fora de @layer no
// globals.css, e regra sem layer vence qualquer utilitário (que fica em @layer
// utilities). Sem o `!` o link herdaria --ink e mudaria de cor.
// O hover é `hover:text-green-deep!` (não a classe `hv-emerald` do DS): a cor base é
// `text-ink-50!` (layered-important) e, pra important, layer vence unlayered - a regra
// `.hv-emerald:hover` do globals (unlayered) perderia. O utilitário de hover cai na mesma
// @layer utilities e ganha por especificidade (o `:hover` soma). green-deep == --emerald.
const linkCls = 'font-sans text-[14px] font-semibold leading-[normal]';
const activeCls = (active: boolean) =>
  active ? 'text-green-deep!' : 'text-ink-50! hover:text-green-deep!';

export function MarketingNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [nichesOpen, setNichesOpen] = useState(false);
  const close = () => setOpen(false);
  const isNiche = NICHES.some((n) => n.href === pathname);

  return (
    <header
      id="topo"
      className="border-b-line bg-cream/85 sticky top-0 z-[60] border-b backdrop-blur-[14px]"
    >
      <div className="relative mx-auto flex max-w-[1200px] items-center gap-x-7 px-[clamp(16px,4vw,40px)] py-3.5 lg:py-4">
        <Link href="/" aria-label="Demandaê" className="flex flex-none items-center">
          <Logo className="text-[19px] lg:text-2xl" />
        </Link>

        {/* ══ NAV (desktop, lg+) ══ Fora do fluxo e ancorado no centro absoluto do header
            (inset-y-0 + left-1/2 + -translate-x-1/2): fica no centro real da barra,
            independente das larguras do logo (esquerda) e dos CTAs (direita). */}
        <nav className="gap-6.5 hidden items-center lg:absolute lg:inset-y-0 lg:left-1/2 lg:flex lg:-translate-x-1/2">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={pathname === l.href ? 'page' : undefined}
              className={cn(linkCls, activeCls(pathname === l.href))}
            >
              {l.label}
            </Link>
          ))}

          {/* Disclosure controlado: clique/Enter alterna, Escape fecha, e sair o foco do
              grupo (Tab passando o último link) fecha via onBlur. Precisa de estado pra
              expor aria-expanded honesto e ser dispensável no teclado (WCAG 1.4.13) - o
              painel é absolute e cobre o hero. Sem hover-open: hover + toggle-no-clique
              brigam (o mouse abre no hover e o clique logo fecha). Sem aria-haspopup: isto
              é um disclosure de links, não um menu ARIA. */}
          <div
            className="relative"
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) setNichesOpen(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setNichesOpen(false);
            }}
          >
            <button
              type="button"
              aria-expanded={nichesOpen}
              onClick={() => setNichesOpen((v) => !v)}
              className={cn(linkCls, 'flex items-center gap-1.5', activeCls(isNiche))}
            >
              Para quem é
              <Chevron className={cn('transition-transform', nichesOpen && 'rotate-180')} />
            </button>
            {/* pt-3 (não mt-3): mantém o painel encostado no gatilho sem um vão clicável. */}
            <div
              className={cn(
                'absolute left-0 top-full pt-3 transition-opacity',
                nichesOpen ? 'visible opacity-100' : 'invisible opacity-0',
              )}
            >
              <div className="border-line bg-paper flex min-w-[214px] flex-col rounded-2xl border p-1.5 shadow-[var(--shadow-raised)]">
                {NICHES.map((n) => (
                  <Link
                    key={n.href}
                    href={n.href}
                    onClick={() => setNichesOpen(false)}
                    aria-current={pathname === n.href ? 'page' : undefined}
                    className={cn(
                      'hover:bg-cream-2 rounded-xl px-3 py-2.5 font-sans text-[14px] font-semibold leading-[normal]',
                      pathname === n.href ? 'text-green-deep!' : 'text-ink-70!',
                    )}
                  >
                    {n.label}
                  </Link>
                ))}
                {/* Antes era texto morto de rodapé; virou o atalho pra home ("serve pra todos"),
                    discreto e separado por divisor. mt-1.5 + o mesmo px dos itens alinha a
                    borda de ponta a ponta do painel. */}
                <Link
                  href="/"
                  onClick={() => setNichesOpen(false)}
                  className="border-line text-ink-50! hover:text-green-deep! mx-1 mt-1.5 block border-t px-2 pb-1 pt-2.5 font-sans text-[12.5px] font-medium leading-[1.35]"
                >
                  Serve pra todo negócio de hora marcada <span aria-hidden>›</span>
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* ══ CTAs (desktop, lg+) ══ */}
        <div className="ml-auto hidden items-center gap-5 lg:flex">
          <Link
            href="/login"
            className="text-ink-70! hover:text-coral! font-sans text-[14px] font-semibold leading-[normal]"
          >
            Entrar
          </Link>
          <Btn variant="primary" size="md" href="/signup">
            Começar agora
          </Btn>
        </div>

        {/* ══ HAMBÚRGUER (até lg) ══ */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          className="border-edge bg-paper text-green-deep -mr-1 ml-auto flex size-10 flex-none items-center justify-center rounded-xl border lg:hidden"
        >
          {open ? <CloseIcon /> : <BurgerIcon />}
        </button>
      </div>

      {/* ══ PAINEL (até lg) ══ Absoluto e ancorado em top-full: a barra não muda de altura
          ao abrir. No celular ocupa a largura toda; do sm pra cima vira cartão encostado
          na direita - full-width num tablet deixaria a seta do item a meia tela do
          rótulo. */}
      {open && (
        <div className="absolute inset-x-0 top-full lg:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={close}
            className="bg-green-deep/25 absolute inset-x-0 top-0 h-screen"
          />
          <nav
            id="menu-mobile"
            // max-h + overflow: sem isso, em tela baixa (celular deitado, split-screen) o
            // painel absoluto dentro do header sticky não rola e o CTA fica fora da
            // viewport, inalcançável. border-line (4 lados) e não border-t-line: o
            // sm:border-b/l precisa herdar a MESMA cor do topo, senão cai no --edge (creme
            // diferente) e o cartão fica com dois tons de borda.
            className="border-line bg-cream relative ml-auto max-h-[calc(100dvh-4.25rem)] w-full overflow-y-auto border-t px-[clamp(16px,4vw,40px)] pb-5 shadow-[0_18px_40px_-24px_rgba(10,51,36,.45)] sm:w-[380px] sm:rounded-bl-3xl sm:border-b sm:border-l sm:px-5"
          >
            {LINKS.map((l) => (
              <PanelLink key={l.href} href={l.href} active={pathname === l.href} onClick={close}>
                {l.label}
              </PanelLink>
            ))}

            <div className="text-ink-30 px-0.5 pb-1 pt-4 font-sans text-[11px] font-bold uppercase leading-[normal] tracking-[.14em]">
              Para quem é
            </div>
            {NICHES.map((n) => (
              <PanelLink key={n.href} href={n.href} active={pathname === n.href} onClick={close}>
                {n.label}
              </PanelLink>
            ))}

            {/* mt-4: sem respiro, "Entrar" lê como se fosse mais um nicho. */}
            <PanelLink href="/login" onClick={close} className="mt-4">
              Entrar
            </PanelLink>
            {/* onClick no <Btn> (via onNavigate), não numa div de padding em volta: o
                pt-4 seria uma faixa clicável da largura toda acima do botão que só fecha
                o menu - errar 8px pra cima cancelaria o clique no CTA. */}
            <div className="pt-4">
              <Btn variant="primary" size="lg" href="/signup" full onClick={close}>
                Começar agora
              </Btn>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

function PanelLink({
  href,
  active = false,
  onClick,
  className,
  children,
}: {
  href: string;
  active?: boolean;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'border-line flex items-center justify-between border-b py-3.5 font-sans text-[15px] font-semibold leading-[normal]',
        active ? 'text-green-deep!' : 'text-ink!',
        className,
      )}
    >
      {children}
      <span className="text-ink-30" aria-hidden>
        ›
      </span>
    </Link>
  );
}

function Chevron({ className }: { className?: string }) {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function BurgerIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
