import { router, type Href } from 'expo-router';

import type { LoyaltyCard } from './api';

type CardLike = Pick<
  LoyaltyCard,
  'tenantId' | 'tenantSlug' | 'tenantName' | 'prizeLabel' | 'stamps' | 'required' | 'won'
>;

/** Abre um cartão: prêmio liberado -> tela de celebração/resgate (05); em andamento
 * -> detalhe (03). Fonte única da navegação (lista, strip da home, detalhe). */
export function openLoyaltyCard(card: CardLike) {
  if (card.won) {
    router.push({
      pathname: '/fidelidade/celebrar',
      params: {
        tenantId: card.tenantId,
        slug: card.tenantSlug,
        tenant: card.tenantName,
        prize: card.prizeLabel,
        stamps: String(card.stamps),
        required: String(card.required),
        kind: 'prize',
      },
    } as unknown as Href);
  } else {
    router.push(`/fidelidade/${card.tenantId}` as Href);
  }
}
