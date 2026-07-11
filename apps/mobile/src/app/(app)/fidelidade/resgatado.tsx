import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Svg, { Path } from 'react-native-svg';

import { PressScale } from '@/components/press-scale';
import { Text } from '@/components/text';

const fraunces = { fontFamily: 'Fraunces_500Medium' };
const frauncesItalic = { fontFamily: 'Fraunces_500Medium_Italic' };

// Tela 06: confirmação do resgate (o cartão foi zerado no servidor). O cliente mostra
// esta tela no balcão; o dono honra o prêmio (e vê a contagem de resgatados subir).
export default function LoyaltyRedeemedScreen() {
  const { tenant, prize, required } = useLocalSearchParams<{
    tenant: string;
    prize: string;
    required: string;
  }>();

  const scale = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5, tension: 80 }).start();
  }, [scale]);

  return (
    <SafeAreaView className="bg-green-deep flex-1" edges={['top', 'bottom']}>
      <StatusBar style="light" />
      <View className="flex-1 px-6 pb-8 pt-2">
        <View className="flex-1 items-center justify-center">
          <Animated.View
            className="bg-green-bright h-[84px] w-[84px] items-center justify-center rounded-[28px]"
            style={{ transform: [{ scale }] }}
          >
            <Svg width={44} height={44} viewBox="0 0 24 24" fill="none">
              <Path d="M5 12l5 5L19 7" stroke="#0A3324" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Animated.View>

          <Text style={fraunces} className="text-cream mt-6 text-center text-[34px] leading-none">
            Prêmio{' '}
            <Text style={frauncesItalic} className="text-green-bright">
              resgatado!
            </Text>
          </Text>
          <Text className="mt-2.5 max-w-[280px] text-center text-[14.5px] font-medium leading-snug text-[#8fbfa4]">
            Mostre esta tela no balcão da {tenant} - o atendente aplica o seu {prize} na hora.
          </Text>

          <View
            className="mt-7 w-full flex-row items-center gap-3 rounded-2xl p-4"
            style={{ backgroundColor: 'rgba(255,253,248,0.06)', borderWidth: 1, borderColor: 'rgba(47,211,122,0.35)' }}
          >
            <View className="bg-green-bright h-11 w-11 items-center justify-center rounded-[14px]">
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#0A3324" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M19 13v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6" />
                <Path d="M3 8h18v5H3z" />
                <Path d="M12 8v13" />
              </Svg>
            </View>
            <View className="flex-1">
              <Text className="text-cream text-[14px] font-semibold">Prêmio fidelidade</Text>
              <Text className="text-[12.5px] font-medium capitalize text-[#8fbfa4]">{prize}</Text>
            </View>
          </View>

          <View
            className="mt-3.5 w-full flex-row items-center gap-3 rounded-2xl p-3.5"
            style={{ backgroundColor: 'rgba(255,253,248,0.04)', borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(143,191,164,0.4)' }}
          >
            <View className="flex-row" style={{ gap: 4 }}>
              {[0, 1, 2].map((i) => (
                <View
                  key={i}
                  style={{ width: 12, height: 12, borderRadius: 999, borderWidth: 1.5, borderColor: 'rgba(143,191,164,0.5)' }}
                />
              ))}
            </View>
            <Text className="flex-1 text-[12px] font-medium leading-snug text-[#8fbfa4]">
              Cartão zerado - nova rodada já começou.{' '}
              <Text className="text-cream font-semibold">0 de {required || 10}</Text>.
            </Text>
          </View>
        </View>

        <View className="gap-2.5">
          <PressScale
            onPress={() => router.replace('/fidelidade' as Href)}
            className="bg-coral items-center rounded-2xl py-4"
          >
            <Text className="text-[15px] font-bold text-white">Ver meus cartões</Text>
          </PressScale>
          <PressScale
            onPress={() => router.replace('/' as Href)}
            className="items-center rounded-[14px] border py-3"
            style={{ borderColor: 'rgba(250,245,234,0.24)' }}
          >
            <Text className="text-cream text-[13.5px] font-bold">Voltar ao início</Text>
          </PressScale>
        </View>
      </View>
    </SafeAreaView>
  );
}
