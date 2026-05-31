'use client';

import {
  CalendarCheck,
  CalendarClock,
  LayoutDashboard,
  MessagesSquare,
  Scissors,
  Settings,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

// `adminOnly` esconde o item da equipe (STAFF). Configurações (usuários,
// integrações, notificações) é só pra admin (OWNER).
const items = [
  { href: '/dashboard', label: 'Visão geral', icon: LayoutDashboard },
  { href: '/appointments', label: 'Agendamentos', icon: CalendarCheck },
  { href: '/clients', label: 'Clientes', icon: Users },
  { href: '/conversations', label: 'Conversas', icon: MessagesSquare },
  { href: '/schedule', label: 'Horários', icon: CalendarClock },
  { href: '/services', label: 'Serviços', icon: Scissors },
  { href: '/settings', label: 'Configurações', icon: Settings, adminOnly: true },
];

export function DashboardNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1 px-2 py-4">
      {items
        .filter((item) => isAdmin || !item.adminOnly)
        .map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
              active
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
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
