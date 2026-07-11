import Link from 'next/link';

import type { CustomerLoyaltyCardDetail } from '@/lib/loyalty-customer';

import { UsePrizeButton } from './use-prize-button';

// Núcleo visual do detalhe do cartão (cartão de carimbos + últimas visitas). Sem
// data-fetch - o page.tsx resolve o cartão e passa aqui.
export function CardDetailView({ card }: { card: CustomerLoyaltyCardDetail }) {
  const filled = Math.min(card.stamps, card.required);
  const dots = Array.from({ length: card.required }, (_, i) => i < filled);

  return (
    <div className="m-col mt-5 flex flex-col items-start gap-9 md:flex-row">
      {/* cartão */}
      <div className="m-full w-full flex-none md:w-[480px]">
        <div className="bg-green-deep relative overflow-hidden rounded-[24px] px-6 pb-5 pt-6 shadow-[0_26px_50px_-20px_rgba(4,20,13,0.6)]">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(340px 160px at 90% -10%, rgba(47,211,122,.18), transparent 65%), radial-gradient(260px 180px at 5% 110%, rgba(255,90,54,.12), transparent 60%)',
            }}
          />
          <div className="text-on-emerald-mut relative text-[10px] font-bold uppercase tracking-[0.14em]">
            Cartão fidelidade · {card.tenantName}
          </div>
          <div className="relative mt-4 grid grid-cols-5 gap-[11px]">
            {dots.map((checked, i) => (
              <div
                key={i}
                className="flex aspect-square items-center justify-center rounded-full border-[1.5px]"
                style={
                  checked
                    ? {
                        background: 'var(--brand-green-bright)',
                        borderColor: 'var(--brand-green-bright)',
                      }
                    : { background: 'transparent', borderColor: 'rgba(250,245,234,.25)' }
                }
              >
                {checked && (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#0a3324"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4.5 12.5 10 18 19.5 7" />
                  </svg>
                )}
              </div>
            ))}
          </div>
          <div className="relative my-[18px] h-0 border-t border-dashed border-[rgba(250,245,234,0.25)]" />
          <div className="relative flex items-end justify-between gap-2.5">
            <div className="text-cream font-serif text-[18px] leading-tight">{card.ruleLabel}</div>
            <div
              className="whitespace-nowrap text-[13.5px] font-semibold"
              style={{ color: 'var(--brand-green-bright)' }}
            >
              {card.stamps} de {card.required}
            </div>
          </div>
        </div>

        {card.won ? (
          <UsePrizeButton />
        ) : (
          <Link
            href={`/${card.tenantSlug}`}
            className="bg-coral mt-4 block w-full rounded-[15px] py-[15px] text-center text-[15px] font-bold text-white transition-transform hover:-translate-y-0.5"
          >
            Agendar e ganhar mais um
          </Link>
        )}
        <p className="text-ink-30 mt-2.5 text-center text-[12px] leading-relaxed">
          A gente carimba sozinho quando a visita termina. Nada de papelzinho.
        </p>
      </div>

      {/* últimos carimbos */}
      <div className="min-w-0 flex-1">
        <div className="text-ink font-serif text-[18px]">Últimos carimbos</div>
        {card.visits.length === 0 ? (
          <p className="text-ink-50 mt-3 text-sm">
            Ainda sem carimbos - o primeiro vem na próxima visita concluída.
          </p>
        ) : (
          <div className="border-line bg-paper mt-3 rounded-[18px] border px-[18px]">
            {card.visits.map((v, i) => (
              <div
                key={v.id}
                className={`flex items-center gap-3 py-3.5 ${
                  i < card.visits.length - 1 ? 'border-edge border-b' : ''
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-ink truncate text-sm font-semibold">{v.serviceName}</div>
                  <div className="text-ink-50 mt-px text-xs font-medium">{v.whenLabel}</div>
                </div>
                <span className="bg-chip text-green-emph whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold">
                  +1 carimbo
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
