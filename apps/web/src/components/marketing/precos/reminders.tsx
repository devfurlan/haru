export function Reminders() {
  return (
    <section
      id="lembretes"
      // width:100% pra o grid auto-fit não colapsar (section é flex item do layout)
      className="mx-auto w-full max-w-[1080px] px-[clamp(20px,5vw,40px)] pb-5 pt-[clamp(56px,7vw,88px)]"
    >
      <div className="mb-10 text-center">
        <div className="mb-3.5 inline-flex items-center gap-2">
          <span className="bg-coral h-0.5 w-5 rounded-[2px]" />
          <span className="font-sans text-[11px] font-bold uppercase leading-[normal] tracking-[.16em] text-[#0C7E41]">
            Lembretes
          </span>
        </div>
        <h2 className="text-green-deep mx-auto max-w-[760px] font-serif text-[clamp(26px,4.6vw,38px)] font-normal leading-[1.14] tracking-[-.02em]">
          Seu cliente é <span className="italic text-[#0C7E41]">sempre</span> avisado. O WhatsApp é
          opcional.
        </h2>
      </div>

      <div className="mb-5 grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-5">
        <div className="border-line bg-paper rounded-[20px] border p-7 shadow-[var(--shadow-card)]">
          <div className="mb-4 flex items-center justify-between">
            <span className="bg-chip h-11.5 w-11.5 flex items-center justify-center rounded-[var(--radius-icontile)]">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--emerald)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
            </span>
            <span className="bg-chip rounded-full px-3 py-1.5 font-sans text-[10px] font-bold uppercase leading-[normal] tracking-[.1em] text-[#0C7E41]">
              Sempre ligado
            </span>
          </div>
          <div className="text-green-deep mb-2 font-serif text-[19px] font-medium leading-[normal]">
            E-mail e push no app
          </div>
          <div className="text-ink-70 font-sans text-[14.5px] font-normal leading-[1.55]">
            Toda confirmação e todo lembrete saem por e-mail e push -{' '}
            <strong className="text-ink">ilimitado, em todos os planos, sem custo extra.</strong>
          </div>
        </div>
        <div className="border-line bg-paper rounded-[20px] border p-7 shadow-[var(--shadow-card)]">
          <div className="mb-4 flex items-center justify-between">
            <span className="bg-chip h-11.5 w-11.5 flex items-center justify-center rounded-[var(--radius-icontile)]">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--emerald)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 17 0Z" />
              </svg>
            </span>
            <span className="border-line bg-cream text-ink-50 rounded-full border px-3 py-1.5 font-sans text-[10px] font-bold uppercase leading-[normal] tracking-[.1em]">
              Opcional
            </span>
          </div>
          <div className="text-green-deep mb-2 font-serif text-[19px] font-medium leading-[normal]">
            Lembrete por WhatsApp
          </div>
          <div className="text-ink-70 font-sans text-[14.5px] font-normal leading-[1.55]">
            Um canal <strong className="text-ink">adicional</strong>, para clientes que preferem não
            usar o app. Cada plano já vem com uma cota mensal inclusa.
          </div>
        </div>
      </div>
    </section>
  );
}
