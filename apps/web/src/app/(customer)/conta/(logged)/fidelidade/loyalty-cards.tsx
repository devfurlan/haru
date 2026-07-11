'use client';

import { useRouter } from 'next/navigation';

import type { CustomerLoyaltyCard } from '@/lib/loyalty-customer';

/** Tile com a logo do estabelecimento ou a inicial do nome. */
function TenantTile({ card, onEmerald }: { card: CustomerLoyaltyCard; onEmerald: boolean }) {
  if (card.logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={card.logoUrl}
        alt=""
        className="size-[46px] flex-none rounded-[14px] object-cover"
      />
    );
  }
  return (
    <div
      className={`grid size-[46px] flex-none place-items-center rounded-[14px] font-serif text-xl ${
        onEmerald ? 'bg-green-card text-cream' : 'bg-chip text-green-deep'
      }`}
    >
      {card.tenantName.trim().charAt(0).toUpperCase()}
    </div>
  );
}

export function LoyaltyCards({ cards }: { cards: CustomerLoyaltyCard[] }) {
  const router = useRouter();
  const go = (tenantId: string) => router.push(`/conta/fidelidade/${tenantId}`);

  return (
    <div className="m-grid1 mt-6 grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => {
        const faltam = card.required - card.stamps;

        // Prêmio liberado: cartão claro com borda coral + botão.
        if (card.won) {
          return (
            <div
              key={card.tenantId}
              role="button"
              tabIndex={0}
              onClick={() => go(card.tenantId)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && go(card.tenantId)}
              className="border-coral bg-paper flex cursor-pointer flex-col rounded-[20px] border-[1.5px] p-[18px] shadow-[0_14px_30px_-18px_rgba(255,90,54,0.45)] transition-transform hover:-translate-y-[3px]"
            >
              <div className="flex items-center gap-3">
                <TenantTile card={card} onEmerald={false} />
                <div className="min-w-0 flex-1">
                  <div className="text-ink truncate font-serif text-base">{card.tenantName}</div>
                  <div className="text-ink-50 truncate text-[11.5px] font-medium">
                    {card.ruleLabel}
                  </div>
                </div>
                <span className="bg-coral-tint text-coral-deep whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-bold">
                  Prêmio liberado
                </span>
              </div>
              <div className="flex-1" />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  go(card.tenantId);
                }}
                className="bg-coral mt-3.5 w-full rounded-[13px] py-3 text-[13.5px] font-bold text-white transition-transform hover:-translate-y-px active:scale-95"
              >
                Usar meu prêmio
              </button>
            </div>
          );
        }

        // Em andamento: cartão esmeralda escuro (a assinatura do "Cartão fidelidade").
        return (
          <div
            key={card.tenantId}
            role="button"
            tabIndex={0}
            onClick={() => go(card.tenantId)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && go(card.tenantId)}
            className="bg-green-deep relative cursor-pointer overflow-hidden rounded-[20px] p-[18px] shadow-[0_18px_36px_-18px_rgba(4,20,13,0.55)] transition-transform hover:-translate-y-[3px]"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(280px 130px at 90% -10%, rgba(47,211,122,.18), transparent 65%)',
              }}
            />
            <div className="relative flex items-center gap-3">
              <TenantTile card={card} onEmerald />
              <div className="min-w-0 flex-1">
                <div className="text-paper truncate font-serif text-base">{card.tenantName}</div>
                <div className="text-on-emerald-mut truncate text-[11.5px] font-medium">
                  {card.ruleLabel}
                </div>
              </div>
              {faltam <= 2 && (
                <span
                  className="whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-bold"
                  style={{ background: 'rgba(255,90,54,.18)', color: '#ffb3a0' }}
                >
                  {faltam === 1 ? 'Falta 1!' : `Faltam ${faltam}`}
                </span>
              )}
            </div>
            <div className="relative mt-3.5 flex items-center gap-2.5">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[rgba(250,245,234,0.14)]">
                <div
                  className="h-full rounded-full bg-[var(--brand-green-bright)]"
                  style={{ width: `${card.pct}%` }}
                />
              </div>
              <span className="text-cream whitespace-nowrap text-xs font-semibold">
                {card.stamps} de {card.required}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
