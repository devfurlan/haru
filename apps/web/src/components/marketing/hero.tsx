import Link from 'next/link';

import { Button } from '@/components/ui/button';

import { Container } from './container';
import { HeroPhone } from './hero-phone';

export function Hero() {
  return (
    <header className="relative overflow-hidden bg-green-deep text-cream">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(620px 420px at 88% 8%, rgba(47,211,122,.18), transparent 60%), radial-gradient(500px 380px at 8% 95%, rgba(255,90,54,.14), transparent 60%)',
        }}
      />
      <Container className="relative grid items-center gap-14 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-green-bright/30 bg-green-bright/10 px-3.5 py-1.5 text-sm font-semibold text-green-bright">
            <span className="h-2 w-2 animate-pulse-ring rounded-full bg-green-bright" />
            Atendente de IA · ativo 24h no seu WhatsApp
          </div>
          <h1 className="mb-5 font-serif text-[clamp(2.6rem,5.4vw,4.3rem)] font-semibold leading-[1.02] tracking-[-0.02em]">
            Sua agenda lotando <em className="italic text-green-bright">sozinha</em>, direto no{' '}
            <span className="text-coral-soft">WhatsApp</span>.
          </h1>
          <p className="mb-8 max-w-[520px] text-lg leading-relaxed text-cream/85">
            O Demandaê é um atendente de IA que agenda, remarca e cancela conversando naturalmente
            com seu cliente. Sem app, sem formulário, sem link complicado. Você só acompanha pelo
            painel.
          </p>
          <div className="flex flex-wrap items-center gap-3.5">
            <Button asChild variant="coral" size="pill">
              <Link href="/interesse">Conectar meu WhatsApp →</Link>
            </Button>
            <Button
              asChild
              size="pill"
              variant="outline"
              className="border-cream/25 text-cream hover:border-cream/60 hover:bg-cream/10"
            >
              <a href="#como">Ver como funciona</a>
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-5 text-sm text-cream/70">
            <span>
              <span className="font-extrabold text-green-bright">✓</span> Pronto em minutos
            </span>
            <span>
              <span className="font-extrabold text-green-bright">✓</span> Número próprio do seu negócio
            </span>
          </div>
        </div>

        <HeroPhone />
      </Container>
    </header>
  );
}
