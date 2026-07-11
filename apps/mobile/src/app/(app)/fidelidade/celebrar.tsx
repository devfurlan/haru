import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Svg, { Path, Rect } from 'react-native-svg';

import { PressScale } from '@/components/press-scale';
import { Text } from '@/components/text';
import { api, ApiError } from '@/lib/api';

const fraunces = { fontFamily: 'Fraunces_500Medium' };
const frauncesItalic = { fontFamily: 'Fraunces_500Medium_Italic' };

// Telas de "momento" 04 (carimbo novo) e 05 (prêmio liberado) - mesma casca esmeralda,
// variam por `kind`. Navegada pelo gatilho de carimbo (home) ou pelo botão do cartão.
export default function LoyaltyCelebrateScreen() {
  const params = useLocalSearchParams<{
    tenantId: string;
    slug: string;
    tenant: string;
    prize: string;
    stamps: string;
    required: string;
    kind: 'stamp' | 'prize';
  }>();
  const isPrize = params.kind === 'prize';
  const required = Number(params.required) || 10;
  const stamps = isPrize ? required : Number(params.stamps) || 0;
  const faltam = required - stamps;
  const [redeeming, setRedeeming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scale = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5, tension: 80 }).start();
  }, [scale]);

  async function redeem() {
    setError(null);
    setRedeeming(true);
    try {
      const res = await api.loyaltyRedeem(params.tenantId);
      router.replace({
        pathname: '/fidelidade/resgatado',
        params: { tenant: params.tenant, prize: res.prizeLabel, required: String(res.required) },
      } as unknown as Href);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não deu pra resgatar agora.');
      setRedeeming(false);
    }
  }

  return (
    <SafeAreaView className="bg-green-deep flex-1" edges={['top', 'bottom']}>
      <StatusBar style="light" />
      <View className="flex-1 px-6 pb-8 pt-2">
        <View className="flex-1 items-center justify-center">
          {isPrize ? (
            <Animated.View style={{ transform: [{ scale }] }}>
              <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: '#ffeee9' }}>
                <Text className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#c2401f' }}>
                  Prêmio liberado
                </Text>
              </View>
            </Animated.View>
          ) : (
            <Animated.View
              className="bg-green-bright h-[92px] w-[92px] items-center justify-center rounded-full"
              style={{ transform: [{ scale }] }}
            >
              <Svg width={46} height={46} viewBox="0 0 24 24" fill="none" stroke="#0A3324" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M19 13v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6" />
                <Rect x="3" y="8" width="18" height="5" rx="1.5" />
                <Path d="M12 8v13" />
                <Path d="M7.5 8a2.5 2.5 0 1 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 1 1 0 5" />
              </Svg>
            </Animated.View>
          )}

          <Text style={fraunces} className="text-cream mt-6 text-center text-[34px] leading-none">
            {isPrize ? 'Cartão ' : 'Carimbo '}
            <Text style={frauncesItalic} className="text-green-bright">
              {isPrize ? 'completo!' : 'novo!'}
            </Text>
          </Text>
          <Text className="mt-2.5 max-w-[280px] text-center text-[14.5px] font-medium leading-snug text-[#8fbfa4]">
            {isPrize
              ? `Seu ${params.prize} em ${params.tenant} tá liberado - bora usar?`
              : `Visita concluída em ${params.tenant}. Agora são ${stamps} de ${required}${
                  faltam > 0 ? ` - ${faltam === 1 ? 'falta só 1' : `faltam ${faltam}`} pro seu ${params.prize}` : ''
                }.`}
          </Text>

          {/* mini-cartão */}
          <View
            className="mt-7 w-full rounded-[20px] p-4"
            style={{ backgroundColor: 'rgba(255,253,248,0.06)', borderWidth: 1, borderColor: 'rgba(47,211,122,0.28)' }}
          >
            <Text className="text-[9.5px] font-bold uppercase tracking-widest text-[#8fbfa4]">
              Cartão fidelidade · {params.tenant}
            </Text>
            <View className="mt-3 flex-row" style={{ gap: 6 }}>
              {Array.from({ length: required }, (_, i) => (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    aspectRatio: 1,
                    borderRadius: 999,
                    borderWidth: 1.5,
                    backgroundColor: i < stamps ? '#2fd37a' : 'rgba(255,253,248,0.06)',
                    borderColor: i < stamps ? '#2fd37a' : 'rgba(143,191,164,0.4)',
                  }}
                />
              ))}
            </View>
            <View className="mt-3 flex-row items-center justify-between">
              <Text className="text-cream text-[13px]" style={fraunces}>
                A cada {required} visitas, {params.prize}
              </Text>
              <Text className="text-green-bright text-[12px] font-semibold">
                {stamps} de {required}
              </Text>
            </View>
          </View>

          {error && <Text className="text-coral mt-4 text-center text-[13px]">{error}</Text>}
        </View>

        {/* CTAs */}
        <View className="gap-2.5">
          {isPrize ? (
            <>
              <PressScale onPress={redeem} disabled={redeeming} className="bg-coral items-center rounded-2xl py-4">
                <Text className="text-[15px] font-bold text-white">
                  {redeeming ? 'Resgatando…' : 'Usar meu prêmio agora'}
                </Text>
              </PressScale>
              <PressScale
                onPress={() => router.back()}
                className="items-center rounded-[14px] border py-3"
                style={{ borderColor: 'rgba(250,245,234,0.24)' }}
              >
                <Text className="text-cream text-[13.5px] font-bold">Deixar guardado</Text>
              </PressScale>
            </>
          ) : (
            <>
              <PressScale
                onPress={() =>
                  router.replace({ pathname: '/book/[slug]', params: { slug: params.slug } } as Href)
                }
                className="bg-coral items-center rounded-2xl py-4"
              >
                <Text className="text-[15px] font-bold text-white">Agendar o próximo</Text>
              </PressScale>
              <PressScale
                onPress={() => router.replace(`/fidelidade/${params.tenantId}` as Href)}
                className="items-center rounded-[14px] border py-3"
                style={{ borderColor: 'rgba(250,245,234,0.24)' }}
              >
                <Text className="text-cream text-[13.5px] font-bold">Ver meu cartão</Text>
              </PressScale>
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
