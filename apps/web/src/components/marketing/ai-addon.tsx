import { Button } from '@/components/ui/button';

import { Container } from './container';
import { InterestDialog } from './interest-dialog';

export function AiAddon() {
  return (
    <section id="addon" className="border-edge bg-line border-y">
      <Container className="grid items-center gap-16 py-24 lg:grid-cols-[1fr_400px]">
        <div>
          <span className="bg-paper border-edge text-ink-70 mb-5 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[0.68rem] font-bold uppercase tracking-[0.14em]">
            <span className="bg-green-bright animate-pulse-ring h-1.5 w-1.5 rounded-full" />
            Em desenvolvimento
          </span>
          <h2 className="mb-3.5 font-serif text-[clamp(1.9rem,3.4vw,2.25rem)] font-medium leading-[1.1] tracking-[-0.02em]">
            Addon: atendente IA <em className="font-normal italic">no WhatsApp</em>
          </h2>
          <p className="text-ink-70 max-w-[520px] text-[1rem] leading-[1.6]">
            Pra quem quiser, um atendente que conversa com o cliente e marca o horário direto no
            WhatsApp - em cima da mesma agenda, sem virar um segundo sistema. Tá no forno; entra na
            lista que a gente te chama pra testar primeiro.
          </p>
        </div>

        <div className="bg-paper border-edge rounded-[18px] border p-7">
          <div className="text-ink mb-1 font-serif text-[1.15rem] font-semibold">
            Quer testar primeiro?
          </div>
          <p className="text-ink-70 mb-5 text-[0.9rem] leading-[1.5]">
            Entre na lista de espera e a gente te avisa assim que abrir.
          </p>
          <InterestDialog
            title="Lista de espera do Atendente IA"
            description="O Atendente IA no WhatsApp está a caminho. Deixe seus dados que a gente avisa assim que abrir - e você entra na frente."
          >
            <Button variant="coral" className="h-12 w-full rounded-[14px] text-base">
              Entrar na lista de espera
            </Button>
          </InterestDialog>
          <div className="text-ink-30 mt-3 text-center text-xs font-medium">
            Sem spam. Só o aviso do lançamento.
          </div>
        </div>
      </Container>
    </section>
  );
}
