import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/text';
import { TenantAvatar } from '@/components/tenant-avatar';

// Tela de sucesso animada (design 11 + spec de micro-interações "Confirmar → sucesso"):
// a tela sobe de baixo (520ms), o selo entra com mola + anel pulsando, e título/card
// escalonam. Renderizada como overlay absoluto por cima do fluxo (padrão "deu certo"
// do Nubank). Só apresentação; o Animated nativo dispensa setup de babel (Reanimated).
const fraunces = { fontFamily: 'Fraunces_500Medium' };
const frauncesItalic = { fontFamily: 'Fraunces_500Medium_Italic' };
const frauncesSemi = { fontFamily: 'Fraunces_600SemiBold' };

const EASE = Easing.bezier(0.22, 1, 0.36, 1);

type Props = {
  titlePlain?: string; // "Tá" (opcional; ex.: "Remarcado!" usa só o acento)
  titleAccent: string; // "marcado!"
  message: string;
  tenant: { name: string; logoUrl?: string | null };
  line?: string | null; // "Corte masculino · com Téo"
  when?: string | null; // "Sáb, 5 jul · 15h30"
  price?: string | null; // "R$ 45"
  icon?: 'check' | 'refresh' | 'x'; // check (agendou), seta circular (remarcou 13d) ou x (cancelou 13b)
  previousWhen?: string | null; // horário antigo riscado no topo do card (remarcação)
  showCard?: boolean; // esconde o card de tenant/horário (design 13b "Cancelado" não tem)
  children: ReactNode; // ações do rodapé
};

const SEAL_PATH = {
  check: 'M5 12l5 5L19 7',
  refresh: 'M3 12a9 9 0 1 0 3-6.7M3 4v4h4',
  x: 'M8 8l8 8M16 8l-8 8',
};

export function BookingSuccess({
  titlePlain,
  titleAccent,
  message,
  tenant,
  line,
  when,
  price,
  icon = 'check',
  previousWhen,
  showCard = true,
  children,
}: Props) {
  const isX = icon === 'x';
  const sealPath = SEAL_PATH[icon];
  const { height } = useWindowDimensions();
  const [slide] = useState(() => new Animated.Value(0));
  const [check] = useState(() => new Animated.Value(0));
  const [glow] = useState(() => new Animated.Value(0));
  const [title] = useState(() => new Animated.Value(0));
  const [card] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slide, { toValue: 1, duration: 520, easing: EASE, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(180),
        // selo cresce do zero com overshoot (o "momento de alívio") - curva do spec.
        Animated.timing(check, {
          toValue: 1,
          duration: 460,
          easing: Easing.bezier(0.34, 1.56, 0.64, 1),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(300),
        Animated.timing(title, { toValue: 1, duration: 420, easing: EASE, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(400),
        Animated.timing(card, { toValue: 1, duration: 420, easing: EASE, useNativeDriver: true }),
      ]),
    ]).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [slide, check, glow, title, card]);

  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });
  const overlayOpacity = slide.interpolate({ inputRange: [0, 0.12, 1], outputRange: [0, 1, 1] });
  const stagger = (v: Animated.Value) => ({
    opacity: v,
    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
  });
  const glowStyle = {
    opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0.9] }),
    transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }],
  };

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        // elevation/zIndex garantem que o overlay cubra o rodapé da tela de baixo no Android.
        { backgroundColor: '#0a3324', transform: [{ translateY }], opacity: overlayOpacity, elevation: 24, zIndex: 24 },
      ]}
    >
      <StatusBar style="light" />
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        <View className="flex-1 justify-between px-6 pb-5 pt-4">
          <View className="flex-1 items-center justify-center">
            {/* selo + anel pulsante (o cancelamento não pulsa: selo neutro) */}
            <View className="items-center justify-center">
              {!isX ? (
                <Animated.View
                  style={[
                    glowStyle,
                    { position: 'absolute', top: -10, left: -10, right: -10, bottom: -10, borderRadius: 60, backgroundColor: '#2fd37a' },
                  ]}
                />
              ) : null}
              <Animated.View style={{ transform: [{ scale: check }] }}>
                <View
                  className={
                    isX
                      ? 'h-[84px] w-[84px] items-center justify-center rounded-[28px] border border-[rgba(143,191,164,0.3)] bg-[rgba(255,253,248,0.08)]'
                      : 'bg-green-bright h-[84px] w-[84px] items-center justify-center rounded-[28px]'
                  }
                >
                  <Svg width={44} height={44} viewBox="0 0 24 24" fill="none">
                    <Path
                      d={sealPath}
                      stroke={isX ? '#faf5ea' : '#0a3324'}
                      strokeWidth={icon === 'check' ? 3.2 : 2.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </View>
              </Animated.View>
            </View>

            <Animated.View style={[stagger(title), { alignItems: 'center' }]}>
              <Text
                style={fraunces}
                className="text-cream mt-[22px] text-center text-[34px] leading-[36px] tracking-tight"
              >
                {titlePlain ? `${titlePlain} ` : ''}
                <Text style={frauncesItalic} className={isX ? 'text-[#8fbfa4]' : 'text-green-bright'}>
                  {titleAccent}
                </Text>
              </Text>
              <Text className="mt-2.5 max-w-[250px] text-center text-[14.5px] leading-6 text-[#8fbfa4]">
                {message}
              </Text>
            </Animated.View>

            {showCard ? (
            <Animated.View style={[stagger(card), { marginTop: 24, width: '100%' }]}>
              <View className="rounded-[20px] border border-[rgba(47,211,122,0.28)] bg-[rgba(255,253,248,0.06)] p-4">
                {previousWhen ? (
                  <Text className="mb-2 text-[11.5px] capitalize text-[#8fbfa4] line-through">
                    {previousWhen}
                  </Text>
                ) : null}
                <View className="flex-row items-center gap-3">
                  <TenantAvatar name={tenant.name} logoUrl={tenant.logoUrl} size={46} radius={14} />
                  <View className="flex-1">
                    <Text style={frauncesSemi} className="text-paper text-base" numberOfLines={1}>
                      {tenant.name}
                    </Text>
                    {line ? (
                      <Text className="mt-0.5 text-xs font-medium text-[#8fbfa4]" numberOfLines={1}>
                        {line}
                      </Text>
                    ) : null}
                  </View>
                </View>
                {when || price ? (
                  <>
                    <View className="my-3.5 h-px border-t border-dashed border-[rgba(143,191,164,0.4)]" />
                    <View className="flex-row items-center justify-between">
                      {when ? (
                        <Text style={frauncesSemi} className="text-cream flex-1 text-[20px] capitalize">
                          {when}
                        </Text>
                      ) : (
                        <View className="flex-1" />
                      )}
                      {price ? (
                        <Text style={frauncesSemi} className="text-coral ml-3 shrink-0 text-base">
                          {price}
                        </Text>
                      ) : null}
                    </View>
                  </>
                ) : null}
              </View>
            </Animated.View>
            ) : null}
          </View>

          <View className="gap-2.5 pt-4">{children}</View>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}
