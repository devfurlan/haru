import Link from 'next/link';

export function MarketingFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:justify-between">
        <p>© {new Date().getFullYear()} Cuidly Tecnologia Ltda</p>
        <nav className="flex gap-4">
          <Link href="/termos" className="transition-colors hover:text-foreground">
            Termos de Serviço
          </Link>
          <Link href="/privacidade" className="transition-colors hover:text-foreground">
            Privacidade
          </Link>
          <Link href="/cookies" className="transition-colors hover:text-foreground">
            Cookies
          </Link>
        </nav>
      </div>
    </footer>
  );
}
