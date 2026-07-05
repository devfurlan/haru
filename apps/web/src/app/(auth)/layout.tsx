import Link from 'next/link';

import { Logo } from '@/components/logo';

// Shell das telas de auth (login/cadastro/recuperação), compartilhado por dono e cliente.
// Cream + coluna estreita alinhada ao topo, espelhando o app. Cada página traz seu próprio
// título Fraunces abaixo do logo.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
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
