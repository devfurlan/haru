import Link from 'next/link';

import { Button } from '@/components/ui/button';

import { Container } from './container';

export function FinalCta() {
  return (
    <section className="bg-green-deep text-cream relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(600px 380px at 50% 0%, rgba(47,211,122,.2), transparent 65%)',
        }}
      />
      <Container className="relative py-24 text-center">
        <h2 className="mx-auto mb-4 max-w-3xl font-serif text-[clamp(2.2rem,4.6vw,3.4rem)] font-semibold leading-[1.05] tracking-[-0.02em]">
          Sua agenda, <em className="text-green-bright italic">sem enrolação</em>, começa hoje.
        </h2>
        <p className="text-cream/85 mx-auto mb-8 max-w-[540px] text-[1.15rem]">
          Publique sua página, libere o app pro seu cliente e deixe o WhatsApp avisar por você -
          tudo comandado de um painel só.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3.5">
          <Button asChild variant="coral" size="pill">
            <Link href="/signup">Começar agora →</Link>
          </Button>
          <Button
            asChild
            size="pill"
            variant="outline"
            className="border-cream/25 text-cream hover:border-cream/60 hover:bg-cream/10"
          >
            <Link href="/precos">Ver planos</Link>
          </Button>
        </div>
      </Container>
    </section>
  );
}
