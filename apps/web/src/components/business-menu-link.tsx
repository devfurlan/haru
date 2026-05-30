'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

interface BusinessMenuLinkProps {
  name: string;
  logoUrl: string | null;
}

// Bloco clicável do estabelecimento no topo do cabeçalho da sidebar. Leva à
// página "Estabelecimento" (/business), onde ficam logo, nome, slug e endereço.
export function BusinessMenuLink({ name, logoUrl }: BusinessMenuLinkProps) {
  const pathname = usePathname();
  const active = pathname === '/business' || pathname.startsWith('/business/');

  // Inicial pro avatar quando não há logo: primeira letra do nome.
  const initial = (name.trim()[0] ?? '?').toUpperCase();

  return (
    <Link
      href="/business"
      aria-label="Estabelecimento"
      className={cn(
        'flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors',
        active ? 'bg-accent' : 'hover:bg-accent',
      )}
    >
      <span className="bg-muted text-muted-foreground flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border text-sm font-semibold">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL externa (Supabase Storage), tamanho fixo
          <img src={logoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          initial
        )}
      </span>
      <span className="block min-w-0 truncate text-sm font-semibold">{name}</span>
    </Link>
  );
}
