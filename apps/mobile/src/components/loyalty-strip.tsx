import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { PressScale } from '@/components/press-scale';
import { Text } from '@/components/text';
import { api, type LoyaltyCard } from '@/lib/api';
import { openLoyaltyCard } from '@/lib/loyalty-nav';

// Strip de "Cartão fidelidade" na Home: mostra o cartão em destaque (o mais avançado /
// prêmio liberado). Se busca falha ou o cliente não tem cartão, some sozinho.
function GiftIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#0A3324" strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M19 13v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6" />
      <Rect x="3" y="8" width="18" height="5" rx="1.5" />
      <Path d="M12 8v13" />
      <Path d="M7.5 8a2.5 2.5 0 1 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 1 1 0 5" />
    </Svg>
  );
}

export function LoyaltyStrip() {
  const [card, setCard] = useState<LoyaltyCard | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      api
        .loyalty()
        .then((res) => alive && setCard(res.cards[0] ?? null))
        .catch(() => alive && setCard(null));
      return () => {
        alive = false;
      };
    }, []),
  );

  if (!card) return null;

  const faltam = card.required - card.stamps;
  const pill = card.won ? 'Prêmio liberado' : faltam === 1 ? 'Falta 1!' : `Faltam ${faltam}`;

  return (
    <PressScale
      onPress={() => openLoyaltyCard(card)}
      className="border-line bg-paper flex-row items-center gap-3 rounded-[18px] border p-3.5"
      style={{
        shadowColor: '#0a3324',
        shadowOpacity: 0.06,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
        elevation: 2,
      }}
    >
      <View className="bg-chip h-11 w-11 items-center justify-center rounded-[14px]">
        <GiftIcon />
      </View>
      <View className="min-w-0 flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-ink text-[14.5px] font-semibold">Cartão fidelidade</Text>
          <View className="rounded-full px-2 py-1" style={{ backgroundColor: '#ffeee9' }}>
            <Text className="text-[10px] font-bold" style={{ color: '#c2401f' }}>
              {pill}
            </Text>
          </View>
        </View>
        <Text className="text-sub mt-0.5 text-[12px] font-medium" numberOfLines={1}>
          {card.tenantName} · {card.stamps} de {card.required} pro {card.prizeLabel}
        </Text>
        <View className="bg-cream-muted mt-2 h-1.5 overflow-hidden rounded-full">
          <View
            className="h-full rounded-full"
            style={{ width: `${card.pct}%`, backgroundColor: '#2fd37a' }}
          />
        </View>
      </View>
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
        <Path d="M9 5l7 7-7 7" stroke="#c3b79c" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </PressScale>
  );
}
