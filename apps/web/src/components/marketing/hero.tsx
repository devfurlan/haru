import Link from 'next/link';

import { Button } from '@/components/ui/button';

import { Container } from './container';
import { HeroShowcase } from './hero-showcase';

export function Hero() {
  return (
    <header className="bg-green-deep text-cream relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(620px 420px at 88% 8%, rgba(47,211,122,.18), transparent 60%), radial-gradient(500px 380px at 8% 95%, rgba(255,90,54,.14), transparent 60%)',
        }}
      />
      <Container className="relative grid items-center gap-14 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
        <div>
          <div className="border-green-bright/30 bg-green-bright/10 text-green-bright mb-6 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold">
            <span className="animate-pulse-ring bg-green-bright h-2 w-2 rounded-full" />
            Sua agenda, sem enrolação.
          </div>
          <h1 className="mb-5 font-serif text-[clamp(2.5rem,5.2vw,4.1rem)] font-semibold leading-[1.03] tracking-[-0.02em]">
            Seu cliente agenda pelo <em className="text-green-bright italic">app</em> ou pela{' '}
            <em className="text-green-bright italic">web</em>.
          </h1>
          <p className="text-cream/85 mb-8 max-w-[540px] text-lg leading-relaxed">
            O Demandaê é a plataforma completa de agendamento: app do cliente, página pública do seu
            negócio e um painel que junta tudo num lugar só. O WhatsApp confirma e lembra sozinho -
            e seu cliente nunca fica preso a um único canal.
          </p>
          <div className="flex flex-wrap items-center gap-3.5">
            <Button asChild variant="coral" size="pill">
              <Link href="/signup">Começar agora →</Link>
            </Button>
            <Button
              asChild
              size="pill"
              variant="outline"
              className="border-cream/25 text-cream hover:border-cream/60 hover:bg-cream/10"
            >
              <a href="#como-cliente">Ver como funciona</a>
            </Button>
          </div>
          <div className="text-cream/70 mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <span>
              <span className="text-green-bright font-extrabold">✓</span> Pronto em minutos
            </span>
            <span>
              <span className="text-green-bright font-extrabold">✓</span> Sem taxa de instalação
            </span>
            <span>
              <span className="text-green-bright font-extrabold">✓</span> Garantia de 30 dias
            </span>
          </div>
        </div>

        <HeroShowcase />
      </Container>
    </header>
  );
}
