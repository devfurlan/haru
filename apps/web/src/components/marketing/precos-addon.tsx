import { Check, Phone, Smartphone, Sparkles } from 'lucide-react';

import { AI_ADDON_SETUP_CENTS, AI_ADDON_TIERS } from '@/lib/billing/pricing';

import { Container } from './container';
import { SectionHeading } from './section-heading';

/** R$ sem centavos (ex.: 9900 -> "R$ 99"). */
function brl(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
}

/**
 * Addon "Atendente IA no WhatsApp" - bloco separado dos planos base. Preços vêm da
 * fonte de verdade em lib/billing/pricing (constante). Soma em cima do plano base.
 */
export function PrecosAddon() {
  return (
    <section id="addon" className="py-24">
      <Container>
        <SectionHeading eyebrow="Addon opcional" title="Atendente IA no WhatsApp.">
          Um atendente de IA que conversa, tira dúvidas e agenda pelo WhatsApp. É opcional e{' '}
          <span className="text-foreground font-semibold">soma em cima do seu plano base</span> -
          com teto próprio de conversas por mês.
        </SectionHeading>

        {/* Escolha de canal na ativação */}
        <div className="mx-auto grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            {
              Icon: Phone,
              title: 'Número Demandaê',
              text: 'Atende por um número nosso, identificando o seu estabelecimento. Ativação na hora, sem burocracia.',
            },
            {
              Icon: Smartphone,
              title: 'Número próprio',
              text: 'Atende pelo número do seu estabelecimento. A gente configura a conta oficial na Meta (WABA) pra você.',
            },
          ].map(({ Icon, title, text }) => (
            <div key={title} className="border-border bg-paper flex gap-3 rounded-2xl border p-5">
              <Icon className="text-coral mt-0.5 size-5 shrink-0" aria-hidden />
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="text-ink-soft mt-1 text-sm leading-relaxed">{text}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tiers do addon */}
        <div className="mx-auto mt-8 grid max-w-md grid-cols-1 gap-6 lg:max-w-none lg:grid-cols-3">
          {AI_ADDON_TIERS.map((a) => (
            <div key={a.key} className="border-border bg-paper flex flex-col rounded-3xl border p-7">
              <div className="flex items-center gap-2">
                <Sparkles aria-hidden className="text-coral size-4" />
                <h3 className="font-serif text-lg font-semibold tracking-[-0.01em]">{a.name}</h3>
              </div>
              <p className="mt-4 flex items-baseline gap-x-1 font-serif leading-none">
                <span className="text-ink-soft text-sm font-semibold">+</span>
                <span className="text-3xl font-black">{brl(a.priceMonthlyCents)}</span>
                <span className="text-ink-soft text-sm font-semibold">/mês</span>
              </p>
              <p className="text-ink-soft mt-3 flex items-center gap-2 text-sm">
                <Check aria-hidden strokeWidth={3} className="text-green-bright size-4 shrink-0" />
                Até {a.conversationsPerMonth.toLocaleString('pt-BR')} conversas/mês
              </p>
              <p className="text-ink-soft/70 mt-2 text-xs">
                + setup único de {brl(AI_ADDON_SETUP_CENTS)}
              </p>
            </div>
          ))}
        </div>

        {/* Setup: cobrado sempre, inclusive no anual. */}
        <p className="text-ink-soft mx-auto mt-6 max-w-2xl text-center text-sm">
          O setup de <span className="text-foreground font-semibold">{brl(AI_ADDON_SETUP_CENTS)}</span>{' '}
          é a configuração da conta oficial no WhatsApp (Meta) e é cobrado uma vez ao ativar o addon -{' '}
          <span className="text-foreground font-semibold">inclusive no plano anual</span>.
        </p>
      </Container>
    </section>
  );
}
