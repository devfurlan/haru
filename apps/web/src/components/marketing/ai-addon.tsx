import { Check, Phone, Smartphone } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

import { Container } from './container';
import { Eyebrow } from './eyebrow';
import { HeroPhone } from './hero-phone';

const highlights = [
  'Conversa em linguagem natural pra agendar, remarcar ou cancelar - sem menu robótico',
  'Entende áudio: transcreve o que o cliente falou e já responde',
  'Mostra serviços, preços e horários no chat e marca ali mesmo',
  'Agrupa mensagens em rajada ("oi" · "queria agendar") num atendimento só',
  'Passa a conversa pra você quando o cliente pede uma pessoa',
];

const channels = [
  {
    Icon: Phone,
    title: 'Número Demandaê',
    text: 'Atende por um número nosso, com a identificação do seu negócio. Ativa na hora.',
  },
  {
    Icon: Smartphone,
    title: 'Número próprio',
    text: 'Atende pelo número do seu negócio. A gente configura a conta oficial na Meta pra você.',
  },
];

export function AiAddon() {
  return (
    <section id="addon" className="bg-cream-2 py-24">
      <Container className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <Eyebrow className="text-coral">Addon premium · opcional</Eyebrow>
          <h2 className="text-foreground mb-4 mt-4 font-serif text-[clamp(2rem,4vw,3.05rem)] font-semibold leading-[1.05] tracking-[-0.01em]">
            Um <em className="text-coral italic">Atendente IA</em> conversando no seu WhatsApp.
          </h2>
          <p className="text-ink-soft mb-7 max-w-[540px] text-[1.1rem] leading-relaxed">
            Além dos avisos automáticos que já vêm no plano, o addon liga a conversa de verdade: o
            cliente manda mensagem e a IA agenda, remarca e tira dúvidas sozinha - inclusive por
            áudio.
          </p>

          <ul className="mb-7 flex flex-col gap-3">
            {highlights.map((h) => (
              <li key={h} className="flex items-start gap-2.5">
                <Check aria-hidden strokeWidth={3} className="text-coral mt-1 size-4 shrink-0" />
                <span className="text-ink-soft text-[1rem] leading-snug">{h}</span>
              </li>
            ))}
          </ul>

          <div className="mb-8 grid gap-3 sm:grid-cols-2">
            {channels.map(({ Icon, title, text }) => (
              <div key={title} className="border-border bg-paper flex gap-3 rounded-2xl border p-4">
                <Icon className="text-coral mt-0.5 size-5 shrink-0" aria-hidden />
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="text-ink-soft mt-1 text-[0.82rem] leading-relaxed">{text}</p>
                </div>
              </div>
            ))}
          </div>

          <Button asChild variant="ink" size="pill">
            <Link href="/precos#addon">Ver preços do addon →</Link>
          </Button>
        </div>

        <div className="order-first lg:order-last">
          <HeroPhone />
        </div>
      </Container>
    </section>
  );
}
