import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback } from 'react';

import { api, type LoyaltyCard } from './api';

const KEY = 'loyaltySeenStamps';

// Gatilho das telas de "momento" (04 carimbo novo / 05 prêmio liberado): compara a
// contagem de carimbos com a última vista (AsyncStorage) no foco da Home. Se subiu,
// abre a celebração. Nunca dispara no primeiríssimo uso (só grava a baseline). Como não
// há push de "carimbo caiu" pelo servidor, esta detecção local é o gatilho.
// ponytail: faz um GET a mais no foco da Home (além do da strip); barato, deixo assim.
export function useLoyaltyCelebration() {
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        let cards: LoyaltyCard[];
        try {
          cards = (await api.loyalty()).cards;
        } catch {
          return;
        }
        if (!alive) return;

        const raw = await AsyncStorage.getItem(KEY);
        const seen: Record<string, number> = raw ? JSON.parse(raw) : {};
        const current: Record<string, number> = {};
        for (const c of cards) current[c.tenantId] = c.stamps;

        let celebrated: LoyaltyCard | null = null;
        let kind: 'stamp' | 'prize' = 'stamp';
        if (raw) {
          for (const c of cards) {
            const before = seen[c.tenantId];
            if (before === undefined || c.stamps <= before) continue;
            if (c.won) {
              celebrated = c;
              kind = 'prize';
              break; // prêmio recém-completado tem prioridade
            }
            if (!celebrated) celebrated = c;
          }
        }

        await AsyncStorage.setItem(KEY, JSON.stringify(current));

        if (celebrated && alive) {
          router.push({
            pathname: '/fidelidade/celebrar',
            params: {
              tenantId: celebrated.tenantId,
              slug: celebrated.tenantSlug,
              tenant: celebrated.tenantName,
              prize: celebrated.prizeLabel,
              stamps: String(celebrated.stamps),
              required: String(celebrated.required),
              kind,
            },
          } as unknown as Href);
        }
      })();
      return () => {
        alive = false;
      };
    }, []),
  );
}
