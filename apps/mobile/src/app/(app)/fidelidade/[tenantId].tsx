import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { Text } from '@/components/text';
import { PressScale } from '@/components/press-scale';
import { api, ApiError, type LoyaltyCardDetail } from '@/lib/api';
import { openLoyaltyCard } from '@/lib/loyalty-nav';

const fraunces = { fontFamily: 'Fraunces_600SemiBold' };
const frauncesMed = { fontFamily: 'Fraunces_500Medium' };

function Dot({ checked }: { checked: boolean }) {
  return (
    <View
      className="items-center justify-center"
      style={{
        width: '18%',
        aspectRatio: 1,
        marginBottom: 10,
        borderRadius: 999,
        borderWidth: 1.5,
        backgroundColor: checked ? '#2fd37a' : 'rgba(255,253,248,0.06)',
        borderColor: checked ? '#2fd37a' : 'rgba(143,191,164,0.4)',
      }}
    >
      {checked && (
        <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
          <Path
            d="M4.5 12.5 10 18 19.5 7"
            stroke="#0a3324"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      )}
    </View>
  );
}

export default function LoyaltyCardDetailScreen() {
  const { tenantId } = useLocalSearchParams<{ tenantId: string }>();
  const [card, setCard] = useState<LoyaltyCardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setCard(await api.loyaltyDetail(tenantId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível carregar o cartão.');
    }
  }, [tenantId]);

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

  const filled = card ? Math.min(card.stamps, card.required) : 0;

  return (
    <SafeAreaView className="bg-cream flex-1" edges={['top', 'bottom']}>
      <ScreenHeader title={card?.tenantName ?? 'Cartão'} eyebrow="Cartão fidelidade" />
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pb-12"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0e7a45" />
        }
      >
        {loading ? (
          <View className="gap-4">
            <Skeleton className="h-[220px] w-full rounded-[22px]" />
            <Skeleton className="h-[140px] w-full rounded-[18px]" />
          </View>
        ) : error || !card ? (
          <View className="mt-10 items-center">
            <Text className="text-destructive text-center text-sm">
              {error ?? 'Cartão não encontrado.'}
            </Text>
            <PressScale onPress={onRefresh} className="mt-3 rounded-full px-4 py-2">
              <Text className="text-green-deep text-sm font-bold">Tentar de novo</Text>
            </PressScale>
          </View>
        ) : (
          <>
            {/* cartão de carimbos */}
            <View
              className="bg-green-deep overflow-hidden rounded-[22px] p-5"
              style={{
                shadowColor: '#04140d',
                shadowOpacity: 0.5,
                shadowRadius: 20,
                shadowOffset: { width: 0, height: 14 },
                elevation: 4,
              }}
            >
              <Text className="text-[9.5px] font-bold uppercase tracking-widest text-[#8fbfa4]">
                Cartão fidelidade · {card.tenantName}
              </Text>
              <View className="mt-3.5 flex-row flex-wrap justify-between">
                {Array.from({ length: card.required }, (_, i) => (
                  <Dot key={i} checked={i < filled} />
                ))}
              </View>
              <View
                className="my-3 h-0"
                style={{ borderTopWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(250,245,234,0.25)' }}
              />
              <View className="flex-row items-end justify-between gap-2.5">
                <Text style={frauncesMed} className="text-cream flex-1 text-[17px] leading-tight">
                  {card.ruleLabel}
                </Text>
                <Text className="text-[13px] font-semibold" style={{ color: '#2fd37a' }}>
                  {card.stamps} de {card.required}
                </Text>
              </View>
            </View>

            {/* últimos carimbos */}
            <Text style={fraunces} className="text-ink mt-6 text-[17px]">
              Últimos carimbos
            </Text>
            {card.visits.length === 0 ? (
              <Text className="text-sub mt-2 text-[13px] leading-snug">
                Ainda sem carimbos - o primeiro vem na próxima visita concluída.
              </Text>
            ) : (
              <View className="border-line bg-paper mt-2 rounded-[18px] border px-4">
                {card.visits.map((v, i) => (
                  <View
                    key={v.id}
                    className="flex-row items-center gap-3 py-3"
                    style={
                      i < card.visits.length - 1
                        ? { borderBottomWidth: 1, borderStyle: 'dotted', borderColor: '#e6dcc6' }
                        : undefined
                    }
                  >
                    <View className="flex-1">
                      <Text className="text-ink text-[13.5px] font-semibold" numberOfLines={1}>
                        {v.serviceName}
                      </Text>
                      <Text className="text-sub text-[11.5px] font-medium">{v.whenLabel}</Text>
                    </View>
                    <View className="bg-chip rounded-full px-2.5 py-1">
                      <Text className="text-[11px] font-bold" style={{ color: '#1b7a4b' }}>
                        +1 carimbo
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* CTA */}
            {card.won ? (
              <PressScale
                onPress={() => openLoyaltyCard(card)}
                className="bg-coral mt-6 items-center rounded-2xl py-4"
              >
                <Text className="text-[15px] font-bold text-white">Usar meu prêmio agora</Text>
              </PressScale>
            ) : (
              <PressScale
                onPress={() =>
                  router.push({ pathname: '/book/[slug]', params: { slug: card.tenantSlug } } as Href)
                }
                className="bg-coral mt-6 items-center rounded-2xl py-4"
              >
                <Text className="text-[15px] font-bold text-white">Agendar e ganhar mais um</Text>
              </PressScale>
            )}
            <Text className="text-sub mt-2.5 text-center text-[11.5px] leading-snug">
              A gente carimba sozinho quando a visita termina. Nada de papelzinho.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
