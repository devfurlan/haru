export type Step = { title: string; body: string };

// Copy da home. As landings de nicho passam os mesmos três passos na língua do nicho
// (`steps`), mantendo faixa, grid e tipografia idênticos - o molde é o mesmo.
const HOME_STEPS: Step[] = [
  {
    title: 'Você cadastra',
    body: 'Seus serviços, horários e equipe. Leva minutos, e a gente ajuda.',
  },
  {
    title: 'O cliente agenda',
    body: 'Sozinho, pelo app ou pela sua página. 24 horas por dia, sem você responder.',
  },
  {
    title: 'Você fatura',
    body: 'Recebe, cobra e fideliza. Tudo no mesmo lugar, do jeito que já devia ser.',
  },
];

export function HowItWorks({ steps = HOME_STEPS }: { steps?: Step[] }) {
  return (
    // Creme forte (não o --cream da página, nem o --paper dos cards): a faixa vem logo
    // depois dos nichos e precisa se destacar do fundo pra não flutuar solta.
    <section id="como-funciona" className="border-edge bg-cream-2 border-y">
      <div className="mx-auto max-w-[1080px] px-[clamp(20px,5vw,40px)] py-[clamp(56px,7vw,88px)]">
        <div className="mx-auto mb-[clamp(36px,4vw,52px)] max-w-[600px] text-center">
          <div className="mb-3.5 inline-flex items-center gap-2">
            <span className="bg-coral h-0.5 w-5 rounded-[2px]" />
            <span className="font-sans text-[11px] font-bold uppercase leading-[normal] tracking-[.16em] text-[#0C7E41]">
              Como funciona
            </span>
          </div>
          <h2 className="text-green-deep font-serif text-[clamp(28px,4.6vw,40px)] font-normal leading-[1.1] tracking-[-.02em]">
            Três passos. <span className="italic text-[#0C7E41]">Pronto</span>.
          </h2>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-[clamp(20px,3vw,32px)]">
          {steps.map((s, i) => (
            <div key={s.title} className="flex flex-col items-center text-center">
              <div className="border-edge bg-paper mb-5 grid h-16 w-16 place-items-center rounded-[50%] border font-serif text-[30px] font-normal leading-[normal] text-[#0C7E41]">
                {i + 1}
              </div>
              <h3 className="text-green-deep mb-2 font-serif text-[20px] font-medium leading-[normal]">
                {s.title}
              </h3>
              <p className="text-ink-70 max-w-[280px] font-sans text-[15px] font-normal leading-[1.55]">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
