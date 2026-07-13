import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { PressScale } from '@/components/press-scale';
import { Text } from '@/components/text';
import { TenantAvatar } from '@/components/tenant-avatar';

// Overlay "Você tá na fila" (screen 02): o momento de alívio depois de entrar na fila.
// Mesma linguagem da tela de sucesso do agendamento (sobe de baixo, selo com mola),
// renderizado por cima do fluxo de agendar. Copy nunca promete o horário (regra de tom).
const fraunces = { fontFamily: 'Fraunces_500Medium' };
const frauncesItalic = { fontFamily: 'Fraunces_500Medium_Italic' };
const frauncesSemi = { fontFamily: 'Fraunces_600SemiBold' };
const EASE = Easing.bezier(0.22, 1, 0.36, 1);

type Props = {
  tenantName: string;
  logoUrl: string | null;
  serviceName: string;
  professionalName: string | null;
  dayLabel: string; // "Sáb, 15/07"
  position: number; // 1-based
  onSeeInterests: () => void;
  onClose: () => void;
};

export function WaitlistJoinedOverlay({
  tenantName,
  logoUrl,
  serviceName,
  professionalName,
  dayLabel,
  position,
  onSeeInterests,
  onClose,
}: Props) {
  const { height } = useWindowDimensions();
  const [slide] = useState(() => new Animated.Value(0));
  const [seal] = useState(() => new Animated.Value(0));
  const [glow] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slide, { toValue: 1, duration: 480, easing: EASE, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(150),
        Animated.timing(seal, {
          toValue: 1,
          duration: 460,
          easing: Easing.bezier(0.34, 1.56, 0.64, 1),
          useNativeDriver: true,
        }),
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
  }, [slide, seal, glow]);

  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });
  const opacity = slide.interpolate({ inputRange: [0, 0.12, 1], outputRange: [0, 1, 1] });
  const glowStyle = {
    opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.85] }),
    transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }],
  };
  const withPro = professionalName ? ` com ${professionalName}` : '';

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: '#0a3324', transform: [{ translateY }], opacity, elevation: 24, zIndex: 24 },
      ]}
    >
      <StatusBar style="light" />
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        <View className="flex-1 justify-between px-6 pb-5 pt-4">
          <View className="flex-1 items-center justify-center">
            <View className="items-center justify-center">
              <Animated.View
                style={[
                  glowStyle,
                  { position: 'absolute', top: -12, left: -12, right: -12, bottom: -12, borderRadius: 60, backgroundColor: '#2fd37a' },
                ]}
              />
              <Animated.View style={{ transform: [{ scale: seal }] }}>
                <View className="bg-green-bright h-[88px] w-[88px] items-center justify-center rounded-full">
                  <Svg width={42} height={42} viewBox="0 0 24 24" fill="none">
                    <Path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9Z" stroke="#0a3324" strokeWidth={2.2} strokeLinejoin="round" />
                    <Path d="M13.7 21a2 2 0 0 1-3.4 0" stroke="#0a3324" strokeWidth={2.2} strokeLinecap="round" />
                  </Svg>
                </View>
              </Animated.View>
            </View>

            <Text style={fraunces} className="text-cream mt-[22px] text-center text-[33px] leading-[35px] tracking-tight">
              Você tá na <Text style={frauncesItalic} className="text-green-bright">fila</Text>
            </Text>
            <Text className="mt-2.5 max-w-[270px] text-center text-[14.5px] leading-6 text-[#8fbfa4]">
              Pronto. Se abrir horário {dayLabel.split(',')[0].toLowerCase()}{withPro}, você é avisado aqui no app.
            </Text>

            <View className="mt-6 w-full rounded-[20px] border border-[rgba(47,211,122,0.28)] bg-[rgba(255,253,248,0.06)] p-4">
              <View className="flex-row items-center gap-3">
                <TenantAvatar name={tenantName} logoUrl={logoUrl} size={46} radius={14} />
                <View className="flex-1">
                  <Text style={frauncesSemi} className="text-paper text-base" numberOfLines={1}>
                    {tenantName}
                  </Text>
                  <Text className="mt-0.5 text-xs font-medium text-[#8fbfa4]" numberOfLines={1}>
                    {serviceName}
                    {professionalName ? ` · com ${professionalName}` : ''}
                  </Text>
                </View>
              </View>
              <View className="my-3.5 h-px border-t border-dashed border-[rgba(143,191,164,0.4)]" />
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-[11px] font-medium uppercase tracking-wider text-[#8fbfa4]">Dia na fila</Text>
                  <Text style={frauncesSemi} className="text-cream mt-0.5 text-[18px] capitalize">
                    {dayLabel}
                  </Text>
                </View>
                <View className="rounded-full border border-[rgba(47,211,122,0.4)] bg-[rgba(47,211,122,0.14)] px-3 py-[7px]">
                  <Text className="text-green-bright text-xs font-bold">Você é o {position}º</Text>
                </View>
              </View>
            </View>
            <Text className="mt-3 max-w-[280px] text-center text-xs leading-[18px] text-[#6f9a83]">
              Entrar na fila não garante o horário - quem confirmar primeiro leva. Você pode estar em
              várias filas ao mesmo tempo.
            </Text>
          </View>

          <View className="gap-2.5 pt-4">
            <PressScale onPress={onSeeInterests} className="bg-coral items-center rounded-2xl py-4">
              <Text className="text-[15px] font-bold text-white">Ver meus interesses</Text>
            </PressScale>
            <PressScale
              onPress={onClose}
              haptic={false}
              className="items-center rounded-2xl border border-[rgba(250,245,234,0.24)] py-3.5"
            >
              <Text className="text-cream text-[13.5px] font-bold">Fechar</Text>
            </PressScale>
          </View>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}
