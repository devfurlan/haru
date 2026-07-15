export function Hero() {
  return (
    <section
      id="planos"
      className="mx-auto max-w-[1200px] px-[clamp(20px,5vw,40px)] pb-[44px] pt-[clamp(48px,7vw,76px)] text-center"
    >
      <div className="mb-[18px] flex items-center justify-center gap-[9px]">
        <span className="bg-coral h-[2px] w-[20px] rounded-[2px]" />
        <span className="font-sans text-[11px] font-bold uppercase leading-[normal] tracking-[.16em] text-[#0C7E41]">
          Planos &amp; preços
        </span>
        <span className="bg-coral h-[2px] w-[20px] rounded-[2px]" />
      </div>
      <h1 className="text-green-deep mx-auto mb-[18px] max-w-[840px] font-serif text-[clamp(30px,6vw,52px)] font-normal leading-[1.07] tracking-[-.025em]">
        A plataforma <span className="italic text-[#0C7E41]">completa</span> pela qual você já ia
        pagar.
      </h1>
      <p className="text-ink-70 mx-auto mb-[26px] max-w-[620px] font-sans text-[19px] font-normal leading-[1.55]">
        Agenda, app do cliente, pagamentos, fidelidade e clube de assinatura. Tudo junto, pelo preço
        de um sistema comum.
      </p>
      <div className="border-line bg-paper inline-flex items-center gap-[9px] rounded-full border py-[8px] pl-[12px] pr-[16px] shadow-[var(--shadow-card)]">
        <span className="bg-green-bright h-[8px] w-[8px] animate-[dmd-pulse_1.8s_ease-in-out_infinite] rounded-[50%]" />
        <span className="text-ink-70 font-sans text-[13.5px] font-semibold leading-[normal]">
          Agendamentos ilimitados em todos os planos
        </span>
      </div>
    </section>
  );
}
