// Constantes, tipos e helpers PUROS do programa de fidelidade - sem dependência de
// prisma, pra poderem ser importados tanto no servidor (lib/loyalty.ts, actions) quanto
// no cliente (loyalty-form). A lógica que toca o banco vive em lib/loyalty.ts.

export const STAMP_MIN = 5;
export const STAMP_MAX = 15;
export const STAMP_DEFAULT = 10;

/** Opções de validade (fidVal): dias ou null = nunca expira. */
export const TTL_OPTIONS: { days: number | null; label: string }[] = [
  { days: 90, label: '3 meses' },
  { days: 180, label: '6 meses' },
  { days: null, label: 'Nunca expira' },
];

/** Opções de desconto (%) quando o prêmio é DISCOUNT. */
export const DISCOUNT_OPTIONS = [10, 20, 30, 50];

export type LoyaltyPrizeKind = 'FREE_SERVICE' | 'DISCOUNT';
export type LoyaltyCountMode = 'ALL_SERVICES' | 'SPECIFIC';

export interface LoyaltyProgramView {
  id: string;
  stampsRequired: number;
  prizeKind: LoyaltyPrizeKind;
  prizeServiceId: string | null;
  prizeServiceName: string | null;
  discountPercent: number | null;
  countMode: LoyaltyCountMode;
  qualifyingServiceIds: string[];
  stampTtlDays: number | null;
  paused: boolean;
}

/** Frase do prêmio: "corte de graça" / "30% de desconto". */
export function prizeLabelOf(p: {
  prizeKind: LoyaltyPrizeKind;
  prizeServiceName: string | null;
  discountPercent: number | null;
}): string {
  if (p.prizeKind === 'DISCOUNT') return `${p.discountPercent ?? 0}% de desconto`;
  return `${(p.prizeServiceName ?? 'serviço').toLowerCase()} de graça`;
}
