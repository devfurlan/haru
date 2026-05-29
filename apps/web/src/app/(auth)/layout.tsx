import Link from 'next/link';

import { Logo } from '@/components/logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-secondary/40 p-4">
      <Link href="/" aria-label="Demandaê">
        <Logo pulse />
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
