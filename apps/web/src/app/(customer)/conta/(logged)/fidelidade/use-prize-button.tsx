'use client';

import { useState } from 'react';

// O resgate é confirmado pelo DONO no balcão (evita o cliente zerar o próprio cartão).
// Aqui o botão só revela a instrução - não muda nada no servidor.
export function UsePrizeButton() {
  const [shown, setShown] = useState(false);

  if (shown) {
    return (
      <div className="bg-chip text-green-deep mt-4 rounded-[15px] px-4 py-3.5 text-center text-[13px] font-medium leading-snug">
        Prêmio pronto! Mostre esta tela no balcão - o estabelecimento confirma o resgate na hora.
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setShown(true)}
      className="bg-coral mt-4 w-full rounded-[15px] py-[15px] text-[15px] font-bold text-white transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
    >
      Usar meu prêmio agora
    </button>
  );
}
