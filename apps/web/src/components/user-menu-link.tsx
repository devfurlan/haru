'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

interface UserMenuLinkProps {
  name: string | null;
  email: string;
}

// Bloco clicável do usuário no rodapé do cabeçalho da sidebar. Leva à página
// "Minha conta" (/account), onde ficam perfil e senha.
export function UserMenuLink({ name, email }: UserMenuLinkProps) {
  const pathname = usePathname();
  const active = pathname === '/account' || pathname.startsWith('/account/');

  // Inicial pro avatar: primeira letra do nome, ou do e-mail como fallback.
  const initial = (name?.trim()?.[0] ?? email[0] ?? '?').toUpperCase();

  return (
    <Link
      href="/account"
      aria-label="Minha conta"
      className={cn(
        'mt-3 flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors',
        active ? 'bg-accent' : 'hover:bg-accent',
      )}
    >
      <span className="bg-coral text-cream flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
        {initial}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{name ?? 'Minha conta'}</span>
        <span className="text-muted-foreground block truncate text-xs">{email}</span>
      </span>
    </Link>
  );
}
