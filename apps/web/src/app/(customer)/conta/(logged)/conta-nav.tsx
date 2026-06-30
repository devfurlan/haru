'use client';

import { CalendarDays, House, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

const items = [
  { href: '/conta', label: 'Início', icon: House },
  { href: '/conta/agendamentos', label: 'Meus agendamentos', icon: CalendarDays },
  { href: '/conta/perfil', label: 'Meu cadastro', icon: User },
];

export function ContaNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto">
      {items.map((item) => {
        const Icon = item.icon;
        // "Início" só fica ativo na rota exata - senão /conta/agendamentos o ativaria.
        const active =
          item.href === '/conta'
            ? pathname === '/conta'
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors',
              active
                ? 'border-primary text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground border-transparent',
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
