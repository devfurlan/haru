import { Check } from 'lucide-react';

import { Container } from './container';

const garantias = [
  {
    titulo: 'Garantia de 30 dias',
    texto: 'Não curtiu? Devolução integral, sem perguntinha chata.',
  },
  {
    titulo: 'Sem taxa de instalação',
    texto: 'No plano base você paga a mensalidade e mais nada.',
  },
  {
    titulo: 'Cancele quando quiser',
    texto: 'Um clique, sem multa, sem fidelidade escondida.',
  },
  {
    titulo: 'Suporte de gente, em português',
    texto: 'Fala direto com o fundador pelo WhatsApp. Sem robô de atendimento.',
  },
  {
    titulo: 'LGPD e nuvem',
    texto: 'Dados dos seus clientes protegidos, infraestrutura em nuvem com backup.',
  },
];

/**
 * Bloco de confiança + espaço reservado pra prova social. NÃO inventamos
 * depoimento: enquanto não houver caso real, o card fica como placeholder honesto.
 */
export function SocialProof() {
  return (
    <section className="border-edge bg-line border-y">
      <Container className="py-24">
        <div className="grid items-start gap-16 lg:grid-cols-[420px_1fr]">
          <div>
            <div className="text-sub mb-4 text-[0.72rem] font-bold uppercase tracking-[0.15em]">
              Sem pegadinha
            </div>
            <h2 className="mb-4 font-serif text-[clamp(2rem,4vw,2.6rem)] font-medium leading-[1.08] tracking-[-0.02em]">
              Pode testar <em className="font-normal italic">sem medo.</em>
            </h2>
            <p className="text-ink-70 mb-7 text-[1rem] leading-[1.6]">
              Trocar de sistema dá preguiça, a gente sabe. Por isso o risco fica todo do nosso lado.
            </p>
            <div className="bg-paper rounded-[18px] border-[1.5px] border-dashed border-[#cbbfa4] p-6">
              <div className="text-sub mb-1.5 font-serif text-base italic">
                Reservado pros depoimentos -
              </div>
              <div className="text-ink-30 text-[0.84rem] leading-[1.5]">
                Este espaço vai receber a palavra dos primeiros clientes reais. Nada de prova social
                inventada por aqui.
              </div>
            </div>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2">
            {garantias.map((g) => (
              <div
                key={g.titulo}
                className="bg-paper border-edge flex items-start gap-3.5 rounded-2xl border px-[22px] py-5"
              >
                <span className="bg-chip mt-0.5 grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[11px]">
                  <Check className="text-green-deep size-4" strokeWidth={2.4} aria-hidden />
                </span>
                <div>
                  <div className="text-ink mb-0.5 font-semibold">{g.titulo}</div>
                  <div className="text-ink-70 text-[0.88rem] leading-[1.5]">{g.texto}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
