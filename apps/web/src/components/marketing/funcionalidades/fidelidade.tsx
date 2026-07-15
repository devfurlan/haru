const FEATURES = [
  'Pontos automáticos a cada visita concluída',
  'Recompensas e descontos que você define',
  'Cliente sumido volta com convite automático',
  'Já incluso em todos os planos, sem custo extra',
];

const Check = ({ size = 18, w = '2.6' }: { size?: number; w?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#2FD37A"
    strokeWidth={w}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="mt-0.5 flex-none"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export function Fidelidade() {
  return (
    <section id="fidelidade" className="border-line bg-paper scroll-mt-19.5 border-b border-t">
      <div className="mx-auto max-w-[1200px] px-[clamp(20px,5vw,40px)] py-[clamp(40px,6vw,72px)]">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-center gap-[clamp(30px,5vw,64px)]">
          {/* text */}
          <div>
            <div className="mb-3.5 inline-flex items-center gap-2">
              <span className="bg-coral h-0.5 w-5 rounded-[2px]" />
              <span className="font-sans text-[11px] font-bold uppercase leading-[normal] tracking-[.16em] text-[#0C7E41]">
                Pilar 05 · Fidelidade
              </span>
            </div>
            <h2 className="text-green-deep mb-3.5 max-w-[460px] font-serif text-[clamp(26px,3.6vw,38px)] font-normal leading-[1.12] tracking-[-.02em]">
              O cliente <span className="italic text-[#0C7E41]">volta</span> sozinho.
            </h2>
            <p className="text-ink-70 mb-5.5 max-w-[460px] font-sans text-[16.5px] font-normal leading-[1.6]">
              Pontos a cada visita, recompensas que fazem sentido e um empurrãozinho na hora certa.
              Roda no automático - o cliente volta sem você precisar cobrar.
            </p>
            <div className="flex max-w-[440px] flex-col gap-0.5">
              {FEATURES.map((t) => (
                <div key={t} className="flex items-start gap-3 py-2">
                  <Check />
                  <span className="text-ink-70 font-sans text-[15.5px] font-normal leading-[1.5]">
                    {t}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* loyalty cards */}
          <div className="mx-auto flex w-full max-w-[420px] flex-col gap-3">
            {/* stamp card */}
            <div className="border-line bg-paper p-4.5 rounded-[18px] border shadow-[var(--shadow-card)]">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="bg-chip h-10.5 w-10.5 grid place-items-center rounded-[13px]">
                    <svg
                      width="21"
                      height="21"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--emerald)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="8" r="6" />
                      <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
                    </svg>
                  </span>
                  <div>
                    <div className="text-green-deep font-serif text-[16px] font-medium leading-[normal]">
                      Cartão fidelidade
                    </div>
                    <div className="text-ink-50 font-sans text-[11.5px] font-medium leading-[normal]">
                      Studio Lâmina
                    </div>
                  </div>
                </div>
                <span className="bg-chip text-green-deep rounded-full px-2.5 py-1 font-sans text-[10.5px] font-bold uppercase leading-[normal] tracking-[.04em]">
                  7 de 10
                </span>
              </div>
              <div className="grid grid-cols-[repeat(5,1fr)] gap-2">
                {Array.from({ length: 7 }).map((_, i) => (
                  <span
                    key={`f${i}`}
                    className="bg-green-bright grid aspect-[1] place-items-center rounded-[50%]"
                  >
                    <Check size={15} w="3" />
                  </span>
                ))}
                {Array.from({ length: 3 }).map((_, i) => (
                  <span
                    key={`e${i}`}
                    className="border-edge bg-cream aspect-[1] rounded-[50%] border-[1.5px] border-dashed"
                  />
                ))}
              </div>
              <div className="text-ink-70 mt-3.5 font-sans text-[13px] font-medium leading-[normal]">
                Faltam <span className="text-green-deep font-bold">3 cortes</span> pro próximo
                grátis
              </div>
            </div>
            {/* retention metric */}
            <div className="border-line bg-paper p-4.5 rounded-[18px] border shadow-[var(--shadow-card)]">
              <div className="flex items-baseline justify-between">
                <span className="text-ink-50 font-sans text-[11px] font-bold uppercase leading-[normal] tracking-[.1em]">
                  Clientes que voltam
                </span>
                <span className="text-green-deep font-serif text-[18px] font-semibold leading-[normal]">
                  68%
                </span>
              </div>
              <div className="bg-chip mt-3 h-2 overflow-hidden rounded-full">
                <div className="bg-green-bright h-full w-[68%] rounded-full" />
              </div>
              <div className="text-ink-50 mt-2 font-sans text-[11.5px] font-medium leading-[normal]">
                +12% desde que ativou a fidelidade
              </div>
            </div>
            {/* win-back strip */}
            <div className="border-line bg-paper flex items-center gap-3 rounded-[16px] border px-4 py-3 shadow-[var(--shadow-card)]">
              <span className="bg-chip h-8.5 w-8.5 grid flex-none place-items-center rounded-[10px]">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--emerald)"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 14 4 9l5-5" />
                  <path d="M4 9h11a5 5 0 0 1 0 10h-1" />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-ink font-sans text-[13.5px] font-semibold leading-[normal]">
                  Cliente de volta
                </div>
                <div className="text-ink-50 font-sans text-[11.5px] font-medium leading-[normal]">
                  Rafa · convite automático enviado
                </div>
              </div>
              <span className="bg-chip text-green-deep rounded-full px-2.5 py-1 font-sans text-[10.5px] font-bold uppercase leading-[normal] tracking-[.04em]">
                reativado
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
