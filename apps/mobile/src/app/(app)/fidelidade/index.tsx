import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { Text } from '@/components/text';
import { PressScale } from '@/components/press-scale';
import { api, ApiError, type LoyaltyCard } from '@/lib/api';
import { openLoyaltyCard } from '@/lib/loyalty-nav';

const fraunces = { fontFamily: 'Fraunces_600SemiBold' };
const frauncesItalic = { fontFamily: 'Fraunces_500Medium_Italic' };

function CardTile({ card, onEmerald }: { card: LoyaltyCard; onEmerald: boolean }) {
  if (card.logoUrl) {
    return (
      <Image
        source={{ uri: card.logoUrl }}
        style={{ width: 46, height: 46, borderRadius: 14 }}
        contentFit="cover"
      />
    );
  }
  return (
    <View
      className={`h-[46px] w-[46px] items-center justify-center rounded-[14px] ${
        onEmerald ? 'bg-green-bright' : 'bg-chip'
      }`}
    >
      <Text style={fraunces} className="text-green-deep text-xl">
        {card.tenantName.trim().charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

function CardRow({ card }: { card: LoyaltyCard }) {
  const go = () => openLoyaltyCard(card);
  const faltam = card.required - card.stamps;

  if (card.won) {
    return (
      <PressScale
        onPress={go}
        className="border-coral bg-paper rounded-[20px] border-[1.5px] p-4"
        style={{
          shadowColor: '#ff5a36',
          shadowOpacity: 0.16,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
          elevation: 2,
        }}
      >
        <View className="flex-row items-center gap-3">
          <CardTile card={card} onEmerald={false} />
          <View className="min-w-0 flex-1">
            <Text style={fraunces} className="text-ink text-base" numberOfLines={1}>
              {card.tenantName}
            </Text>
            <Text className="text-sub text-[11.5px] font-medium" numberOfLines={1}>
              {card.ruleLabel}
            </Text>
          </View>
          <View className="rounded-full px-2 py-1" style={{ backgroundColor: '#ffeee9' }}>
            <Text className="text-[10px] font-bold" style={{ color: '#c2401f' }}>
              Prêmio liberado
            </Text>
          </View>
        </View>
        <View className="bg-coral mt-3 items-center rounded-[13px] py-3">
          <Text className="text-[13.5px] font-bold text-white">Usar meu prêmio</Text>
        </View>
      </PressScale>
    );
  }

  return (
    <PressScale
      onPress={go}
      className="bg-green-deep overflow-hidden rounded-[20px] p-4"
      style={{
        shadowColor: '#04140d',
        shadowOpacity: 0.5,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 12 },
        elevation: 3,
      }}
    >
      <View className="flex-row items-center gap-3">
        <CardTile card={card} onEmerald />
        <View className="min-w-0 flex-1">
          <Text style={fraunces} className="text-paper text-base" numberOfLines={1}>
            {card.tenantName}
          </Text>
          <Text className="text-[11.5px] font-medium text-[#8fbfa4]" numberOfLines={1}>
            {card.ruleLabel}
          </Text>
        </View>
        {faltam <= 2 && (
          <View className="rounded-full px-2 py-1" style={{ backgroundColor: 'rgba(255,90,54,0.18)' }}>
            <Text className="text-[10px] font-bold" style={{ color: '#ffb3a0' }}>
              {faltam === 1 ? 'Falta 1!' : `Faltam ${faltam}`}
            </Text>
          </View>
        )}
      </View>
      <View className="mt-3 flex-row items-center gap-2.5">
        <View
          className="h-1.5 flex-1 overflow-hidden rounded-full"
          style={{ backgroundColor: 'rgba(250,245,234,0.14)' }}
        >
          <View
            className="h-full rounded-full"
            style={{ width: `${card.pct}%`, backgroundColor: '#2fd37a' }}
          />
        </View>
        <Text className="text-cream text-xs font-semibold">
          {card.stamps} de {card.required}
        </Text>
      </View>
    </PressScale>
  );
}

export default function LoyaltyCardsScreen() {
  const [cards, setCards] = useState<LoyaltyCard[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.loyalty();
      setCards(res.cards);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível carregar seus cartões.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load().finally(() => setLoading(false));
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <SafeAreaView className="bg-cream flex-1" edges={['top', 'bottom']}>
      <ScreenHeader title="Seus cartões" eyebrow="Fidelidade" />
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pb-12"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0e7a45" />
        }
      >
        <Text className="text-sub text-[13px] leading-snug">
          Carimbo automático a cada visita concluída - relaxa que a gente conta.
        </Text>

        {loading ? (
          <View className="mt-5 gap-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-[110px] w-full rounded-[20px]" />
            ))}
          </View>
        ) : error ? (
          <View className="mt-10 items-center">
            <Text className="text-destructive text-center text-sm">{error}</Text>
            <PressScale onPress={onRefresh} className="mt-3 rounded-full px-4 py-2">
              <Text className="text-green-deep text-sm font-bold">Tentar de novo</Text>
            </PressScale>
          </View>
        ) : cards && cards.length > 0 ? (
          <>
            <View className="mt-5 gap-3">
              {cards.map((card) => (
                <CardRow key={card.tenantId} card={card} />
              ))}
            </View>
            <Text className="text-sub mt-4 text-center text-[12px] leading-snug">
              Só aparecem os lugares com programa de fidelidade no ar.
            </Text>
          </>
        ) : (
          <View className="border-edge bg-paper mt-6 items-center rounded-[22px] border border-dashed px-6 py-12">
            <Text style={fraunces} className="text-ink text-center text-[22px]">
              Nenhum cartão <Text style={frauncesItalic} className="text-green-deep">ainda</Text>
            </Text>
            <Text className="text-sub mt-2 text-center text-[13px] leading-snug">
              Agenda num lugar com programa de fidelidade que o cartão aparece aqui sozinho.
            </Text>
            <PressScale
              onPress={() => router.push('/buscar')}
              className="bg-coral mt-4 rounded-[14px] px-6 py-3"
            >
              <Text className="text-sm font-bold text-white">Buscar estabelecimento</Text>
            </PressScale>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
