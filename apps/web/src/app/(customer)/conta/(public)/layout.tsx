import Link from 'next/link';

import { Logo } from '@/components/logo';

// Shell das telas públicas da área do cliente (entrar/criar) - centralizado, sem
// navegação. Espelha o AuthLayout do dono.
export default function CustomerAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-secondary/40 flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      <Link href="/" aria-label="Demandaê">
        <Logo pulse />
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
