export function HowItWorks() {
  return (
    // Creme forte (não o --cream da página, nem o --paper dos cards): a faixa vem logo
    // depois dos nichos e precisa se destacar do fundo pra não flutuar solta.
    <section id="como-funciona" className="border-edge bg-cream-2 border-y">
      <div className="mx-auto max-w-[1080px] px-[clamp(20px,5vw,40px)] py-[clamp(56px,7vw,88px)]">
        <div className="mx-auto mb-[clamp(36px,4vw,52px)] max-w-[600px] text-center">
          <div className="mb-[14px] inline-flex items-center gap-[9px]">
            <span className="bg-coral h-[2px] w-[20px] rounded-[2px]" />
            <span className="font-sans text-[11px] font-bold uppercase leading-[normal] tracking-[.16em] text-[#0C7E41]">
              Como funciona
            </span>
          </div>
          <h2 className="text-green-deep font-serif text-[clamp(28px,4.6vw,40px)] font-normal leading-[1.1] tracking-[-.02em]">
            Três passos. <span className="italic text-[#0C7E41]">Pronto</span>.
          </h2>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-[clamp(20px,3vw,32px)]">
          <div className="flex flex-col items-center text-center">
            <div className="border-edge bg-paper mb-[20px] grid h-[64px] w-[64px] place-items-center rounded-[50%] border font-serif text-[30px] font-normal leading-[normal] text-[#0C7E41]">
              1
            </div>
            <h3 className="text-green-deep mb-[9px] font-serif text-[20px] font-medium leading-[normal]">
              Você cadastra
            </h3>
            <p className="text-ink-70 max-w-[280px] font-sans text-[15px] font-normal leading-[1.55]">
              Seus serviços, horários e equipe. Leva minutos, e a gente ajuda.
            </p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="border-edge bg-paper mb-[20px] grid h-[64px] w-[64px] place-items-center rounded-[50%] border font-serif text-[30px] font-normal leading-[normal] text-[#0C7E41]">
              2
            </div>
            <h3 className="text-green-deep mb-[9px] font-serif text-[20px] font-medium leading-[normal]">
              O cliente agenda
            </h3>
            <p className="text-ink-70 max-w-[280px] font-sans text-[15px] font-normal leading-[1.55]">
              Sozinho, pelo app ou pela sua página. 24 horas por dia, sem você responder.
            </p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="border-edge bg-paper mb-[20px] grid h-[64px] w-[64px] place-items-center rounded-[50%] border font-serif text-[30px] font-normal leading-[normal] text-[#0C7E41]">
              3
            </div>
            <h3 className="text-green-deep mb-[9px] font-serif text-[20px] font-medium leading-[normal]">
              Você fatura
            </h3>
            <p className="text-ink-70 max-w-[280px] font-sans text-[15px] font-normal leading-[1.55]">
              Recebe, cobra e fideliza. Tudo no mesmo lugar, do jeito que já devia ser.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
