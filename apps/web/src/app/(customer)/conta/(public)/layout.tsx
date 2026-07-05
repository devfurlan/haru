import Link from 'next/link';

import { Logo } from '@/components/logo';

// Shell das telas públicas da área do cliente (entrar/criar). Mesmo visual do AuthLayout
// do dono: cream + coluna estreita alinhada ao topo, espelhando o app.
export default function CustomerAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-cream flex min-h-screen justify-center px-6 py-8">
      <div className="w-full max-w-md">
        <Link href="/" aria-label="Demandaê" className="inline-flex">
          <Logo size="md" />
        </Link>
        {children}
      </div>
    </div>
  );
}
