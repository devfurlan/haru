'use client';

import { CalendarDays, House, Search, User, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

// Nav da área logada do cliente, um componente em dois modos:
// - variant="bottom": bottom tab bar fixa (mobile), espelha o BottomTabBar do app.
// - variant="top": barra horizontal no topo (desktop).
// A pílula desliza pra aba ativa só com CSS (transform + transition), sem lib de motion.
const ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/conta', label: 'Início', icon: House },
  { href: '/conta/buscar', label: 'Buscar', icon: Search },
  { href: '/conta/agendamentos', label: 'Agenda', icon: CalendarDays },
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
  const bottom = variant === 'bottom';

  return (
    <nav
      className={cn(
        'relative flex',
        bottom && 'border-line bg-paper border-t pt-2.5 pb-[calc(env(safe-area-inset-bottom)+8px)]',
      )}
    >
      {/* pílula que desliza pra aba ativa */}
      <span
        aria-hidden
        className="bg-chip absolute rounded-2xl transition-transform duration-[380ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{
          width: `${100 / ITEMS.length}%`,
          top: bottom ? 8 : 0,
          height: bottom ? 'calc(100% - 16px)' : '100%',
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
              'relative z-10 flex flex-1 items-center justify-center transition-colors',
              bottom ? 'flex-col gap-[5px] py-1' : 'gap-2 rounded-2xl px-4 py-2.5',
              active ? 'text-green-deep' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon
              className={cn('transition-transform', active && 'scale-110')}
              style={{ width: bottom ? 24 : 18, height: bottom ? 24 : 18 }}
              strokeWidth={active ? 2.4 : 2}
            />
            <span className={cn(bottom ? 'text-[10.5px]' : 'text-sm', active && 'font-bold')}>
              {it.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
