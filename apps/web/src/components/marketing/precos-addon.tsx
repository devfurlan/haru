import { Phone, Smartphone } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { Container } from './container';
import { InterestDialog } from './interest-dialog';
import { SectionHeading } from './section-heading';

/**
 * Addon "Atendente IA no WhatsApp" - comunicado como "em breve" com lista de espera.
 * Os preços do addon NÃO são exibidos publicamente antes do lançamento (ficam como
 * referência interna no doc canônico de pricing): vender "IA no WhatsApp" agora é o
 * discurso do concorrente. O produto principal é app + web + painel.
 */
export function PrecosAddon() {
  return (
    <section id="addon" className="py-24">
      <Container>
        <SectionHeading eyebrow="Addon opcional · em breve" title="Atendente IA no WhatsApp.">
          Um atendente de IA que vai conversar, tirar dúvidas e agendar pelo WhatsApp - opcional,{' '}
          <span className="text-foreground font-semibold">somando em cima do seu plano base</span>.
          Ainda não está no ar: entre na lista de espera pra ser dos primeiros a ativar.
        </SectionHeading>

        {/* Escolha de canal (na ativação, quando lançar) */}
        <div className="mx-auto grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            {
              Icon: Phone,
              title: 'Número Demandaê',
              text: 'Vai atender por um número nosso, identificando o seu estabelecimento - sem burocracia de Meta.',
            },
            {
              Icon: Smartphone,
              title: 'Número próprio',
              text: 'Vai atender pelo número do seu estabelecimento. A gente configura a conta oficial na Meta (WABA) pra você.',
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

        {/* CTA lista de espera */}
        <div className="mt-8 flex flex-col items-center gap-3 text-center">
          <InterestDialog
            title="Lista de espera do Atendente IA"
            description="O Atendente IA no WhatsApp está a caminho. Deixe seus dados que a gente avisa assim que abrir - e você entra na frente."
          >
            <Button variant="coral" size="pill">
              Entrar na lista de espera →
            </Button>
          </InterestDialog>
          <p className="text-ink-soft/70 text-sm">Seu plano base já funciona 100% sem o addon.</p>
        </div>
      </Container>
    </section>
  );
}
