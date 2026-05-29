import { Button } from '@/components/ui/button';

import { Container } from './container';
import { InterestDialog } from './interest-dialog';

export function FinalCta() {
  return (
    <section className="relative overflow-hidden bg-green-deep text-cream">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(600px 380px at 50% 0%, rgba(47,211,122,.2), transparent 65%)',
        }}
      />
      <Container className="relative py-24 text-center">
        <h2 className="mx-auto mb-4 max-w-3xl font-serif text-[clamp(2.2rem,4.6vw,3.4rem)] font-semibold leading-[1.05] tracking-[-0.02em]">
          Sua próxima cadeira ocupada pode <em className="italic text-green-bright">chegar agora</em>.
        </h2>
        <p className="mx-auto mb-8 max-w-[520px] text-[1.15rem] text-cream/85">
          Conecte o WhatsApp do seu negócio e deixe a IA cuidar da agenda enquanto você cuida do
          cliente.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3.5">
          <InterestDialog>
            <Button variant="coral" size="pill">
              Conectar meu WhatsApp →
            </Button>
          </InterestDialog>
          <Button
            asChild
            size="pill"
            variant="outline"
            className="border-cream/25 text-cream hover:border-cream/60 hover:bg-cream/10"
          >
            <a href="mailto:contato@demandae.com.br">Falar com a gente</a>
          </Button>
        </div>
      </Container>
    </section>
  );
}
