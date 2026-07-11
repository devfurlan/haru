import Link from 'next/link';

import { Button } from '@/components/ui/button';

import { Container } from './container';

export function FinalCta() {
  return (
    <section
      id="cta-final"
      className="bg-green-deep text-cream relative overflow-hidden"
      style={{
        backgroundImage:
          'radial-gradient(800px 380px at 70% -10%, rgba(47,211,122,.14), transparent), radial-gradient(640px 340px at 15% 120%, rgba(255,90,54,.10), transparent)',
      }}
    >
      <Container className="relative max-w-[880px] py-28 text-center">
        <h2 className="mb-[18px] font-serif text-[clamp(2.4rem,5vw,3.5rem)] font-normal leading-[1.06] tracking-[-0.02em]">
          Bora destravar <em className="italic">sua agenda?</em>
        </h2>
        <p className="text-on-emerald-mut mx-auto mb-9 max-w-[560px] text-[1.12rem] leading-[1.6]">
          Configura em minutos: cadastra os serviços, define os horários e compartilha seu link. O
          resto anda sozinho.
        </p>
        <div className="mb-4 flex flex-wrap items-center justify-center gap-3.5">
          <Button asChild variant="coral" size="pill" className="h-14 px-9 text-[1.05rem]">
            <Link href="/signup">Começar agora</Link>
          </Button>
          <Button
            asChild
            size="pill"
            variant="outline"
            className="border-cream/40 text-cream hover:border-cream/70 hover:bg-cream/10 h-14 px-8 text-[1.05rem]"
          >
            <a href="#planos">Ver planos</a>
          </Button>
        </div>
        <div className="text-on-emerald-faint text-sm font-medium">
          Garantia de 30 dias com devolução integral · Suporte em português, direto com o fundador
        </div>
      </Container>
    </section>
  );
}
