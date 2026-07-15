'use client';

/** Card de suporte (esmeralda). O botão abre o chat flutuante (SupportWidget) via
 *  evento global - o widget vive no layout do dashboard. */
export function SupportCard() {
  return (
    <div className="bg-green-deep text-on-emerald flex flex-wrap items-center gap-3.5 rounded-[18px] bg-[radial-gradient(420px_220px_at_15%_-20%,rgba(47,211,122,.14),transparent_60%)] p-[18px]">
      <div className="min-w-[220px] flex-1">
        <div className="font-serif text-[17px] font-semibold">
          Precisa de uma <em className="text-green-bright">mão</em>?
        </div>
        <p className="text-on-emerald-mut mt-1 text-[12.5px] leading-relaxed">
          Suporte de gente de verdade, em português - quem responde é o fundador. Sem robô, sem
          fila.
        </p>
      </div>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event('demanda:open-support'))}
        className="bg-coral flex-none whitespace-nowrap rounded-full px-[17px] py-[11px] text-[12.5px] font-semibold text-white shadow-[0_6px_16px_rgba(255,90,54,.3)] transition active:scale-[.97]"
      >
        Chamar o suporte
      </button>
    </div>
  );
}
