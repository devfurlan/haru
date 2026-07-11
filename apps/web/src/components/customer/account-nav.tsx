'use client';

import { CalendarDays, Gift, House, Search, User, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

// Nav da área logada do cliente, um componente em dois modos:
// - variant="bottom": bottom tab bar fixa (mobile), espelha o BottomTabBar do app.
//   A pílula desliza pra aba ativa só com CSS (transform + transition), sem lib de motion.
// - variant="top": pílulas compactas centradas no header largo do desktop (painel v2).
const ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/conta', label: 'Início', icon: House },
  { href: '/conta/buscar', label: 'Buscar', icon: Search },
  { href: '/conta/agendamentos', label: 'Agenda', icon: CalendarDays },
  { href: '/conta/fidelidade', label: 'Fidelidade', icon: Gift },
  { href: '/conta/perfil', label: 'Perfil', icon: User },
];

// "Início" só ativa na rota exata; os demais também batem em subrotas (ex.: /agendamentos/[id]).
function activeIndex(pathname: string): number {
  const i = ITEMS.findIndex((it) =>
    it.href === '/conta' ? pathname === '/conta' : pathname.startsWith(it.href),
  );
  return i === -1 ? 0 : i;
}

export function AccountNav({ variant }: { variant: 'bottom' | 'top' }) {
  const pathname = usePathname();
  const idx = activeIndex(pathname);

  // Desktop: pílulas soltas (a ativa preenchida), sem barra deslizante.
  if (variant === 'top') {
    return (
      <nav className="flex items-center gap-1.5">
        {ITEMS.map((it, i) => {
          const Icon = it.icon;
          const active = i === idx;
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-2 rounded-full px-5 py-2.5 text-sm transition-colors',
                active
                  ? 'bg-chip text-green-deep font-semibold'
                  : 'text-sub hover:bg-cream-2 hover:text-foreground',
              )}
            >
              <Icon style={{ width: 17, height: 17 }} strokeWidth={active ? 2.4 : 2.1} />
              {it.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  // Mobile: bottom tab bar com pílula deslizante.
  return (
    <nav className="border-line bg-paper relative flex border-t pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2.5">
      {/* pílula que desliza pra aba ativa */}
      <span
        aria-hidden
        className="bg-chip absolute rounded-2xl transition-transform duration-[380ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{
          width: `${100 / ITEMS.length}%`,
          top: 8,
          height: 'calc(100% - 16px)',
          transform: `translateX(${idx * 100}%)`,
        }}
      />
      {ITEMS.map((it, i) => {
        const Icon = it.icon;
        const active = i === idx;
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative z-10 flex flex-1 flex-col items-center justify-center gap-[5px] py-1 transition-colors',
              active ? 'text-green-deep' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon
              className={cn('transition-transform', active && 'scale-110')}
              style={{ width: 24, height: 24 }}
              strokeWidth={active ? 2.4 : 2}
            />
            <span className={cn('text-[10.5px]', active && 'font-bold')}>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
