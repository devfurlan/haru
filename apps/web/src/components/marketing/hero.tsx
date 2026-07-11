import Link from 'next/link';

import { Button } from '@/components/ui/button';

import { Container } from './container';
import { HeroShowcase } from './hero-showcase';

export function Hero() {
  return (
    <section
      id="hero"
      className="bg-green-deep text-cream relative overflow-hidden"
      style={{
        backgroundImage:
          'radial-gradient(1000px 480px at 72% -12%, rgba(47,211,122,.14), transparent), radial-gradient(760px 400px at 8% 118%, rgba(255,90,54,.10), transparent)',
      }}
    >
      <Container className="relative grid items-center gap-14 py-20 lg:grid-cols-[1fr_minmax(0,540px)] lg:py-24">
        <div>
          <div className="border-on-emerald-mut/35 text-on-emerald-mut mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-[7px] text-[0.68rem] font-bold uppercase tracking-[0.14em]">
            <span className="bg-green-bright animate-pulse-ring h-[7px] w-[7px] rounded-full" />
            Sua agenda, sem enrolação
          </div>
          <h1 className="mb-6 font-serif text-[clamp(2.5rem,5.2vw,3.85rem)] font-medium leading-[1.05] tracking-[-0.02em]">
            Seu cliente agenda pelo <em className="text-green-bright font-normal italic">app</em> ou
            pela <em className="text-green-bright font-normal italic">web.</em>
          </h1>
          <p className="text-on-emerald-mut mb-8 max-w-[470px] text-[1.18rem] leading-[1.6]">
            Plataforma completa de agendamento: app do cliente, página do seu negócio e um painel que
            junta tudo. O WhatsApp confirma e lembra sozinho - e ninguém fica preso a um canal só.
          </p>
          <div className="mb-5 flex flex-wrap items-center gap-3.5">
            <Button asChild variant="coral" size="pill">
              <Link href="/signup">Começar agora</Link>
            </Button>
            <Button
              asChild
              size="pill"
              variant="outline"
              className="border-cream/40 text-cream hover:border-cream/70 hover:bg-cream/10"
            >
              <a href="#cliente">Ver como funciona</a>
            </Button>
          </div>
          <div className="text-on-emerald-faint text-sm font-medium">
            Sem taxa de instalação · Garantia de 30 dias · Cancele quando quiser
          </div>
        </div>

        <HeroShowcase />
      </Container>
    </section>
  );
}
