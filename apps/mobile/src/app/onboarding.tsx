import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';

import { PressScale } from '@/components/press-scale';
import { Text } from '@/components/text';
import { markOnboarded } from '@/lib/onboarding';

// Onboarding de primeiro acesso (design 02/03). Dois passos; "Pular" e "Começar"
// gravam a marca de onboarding e mandam pro login.
const display = { fontFamily: 'Fraunces_500Medium', letterSpacing: -0.64 };
const displayItalic = { fontFamily: 'Fraunces_500Medium_Italic' };

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);

  async function finish() {
    await markOnboarded();
    router.replace('/login');
  }

  return (
    <SafeAreaView className="bg-cream flex-1">
      {/* Pular */}
      <View className="flex-row justify-end px-6 pt-1">
        <Pressable onPress={finish} hitSlop={8} className="py-1">
          <Text className="text-sub text-[13px] font-semibold">Pular</Text>
        </Pressable>
      </View>

      <View className="flex-1 px-6 pt-4">
        {/* Hero ilustrado */}
        <View
          className="h-[300px] items-center justify-center overflow-hidden rounded-[28px]"
          style={{ backgroundColor: step === 0 ? '#0a3324' : '#c98f63' }}
        >
          {step === 0 ? (
            <View
              className="h-[150px] w-[150px] items-center justify-center rounded-[26px]"
              style={{ backgroundColor: 'rgba(255,253,248,0.08)', borderWidth: 1, borderColor: 'rgba(47,211,122,0.3)' }}
            >
              <Svg width={72} height={72} viewBox="0 0 24 24" fill="none">
                <Rect x={3.5} y={4.5} width={17} height={16} rx={3} stroke="#2fd37a" strokeWidth={1.8} />
                <Path
                  d="M3.5 9h17M8 3v4M16 3v4M8.5 13.5l2.2 2.2 4-4.3"
                  stroke="#2fd37a"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
          ) : (
            <View
              className="h-[150px] w-[150px] items-center justify-center rounded-[26px]"
              style={{ backgroundColor: 'rgba(10,51,36,0.14)', borderWidth: 1, borderColor: 'rgba(10,51,36,0.2)' }}
            >
              <Svg width={72} height={72} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M12 4.5 14 9l5 .5-3.8 3.4L16.5 18 12 15.4 7.5 18l1.3-5.1L5 9.5 10 9l2-4.5Z"
                  fill="#ff5a36"
                  stroke="#ff5a36"
                  strokeWidth={1.4}
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
          )}
        </View>

        {/* Título + corpo */}
        {step === 0 ? (
          <Text style={display} className="text-ink mt-[34px] text-[32px] leading-[34px]">
            Marque em <Text style={displayItalic} className="text-green-deep">segundos</Text>, sem fila
          </Text>
        ) : (
          <Text style={display} className="text-ink mt-[34px] text-[32px] leading-[34px]">
            Seus lugares <Text style={displayItalic} className="text-green-deep">favoritos</Text> num toque
          </Text>
        )}
        <Text className="text-muted mt-3 text-[15px] leading-[23px]">
          {step === 0
            ? 'Escolhe o lugar, o serviço e o horário. A gente confirma na hora e ainda te lembra antes.'
            : 'Salva a barbearia, o salão, a clínica. Reagendar com quem você confia vira coisa de um clique.'}
        </Text>
      </View>

      {/* Paginação + avançar */}
      <View className="flex-row items-center justify-between px-6 pb-10">
        <View className="flex-row gap-1.5">
          <View
            style={step !== 0 ? { backgroundColor: '#d8cdb5' } : undefined}
            className={`h-2 rounded-full ${step === 0 ? 'bg-coral w-[22px]' : 'w-2'}`}
          />
          <View
            style={step !== 1 ? { backgroundColor: '#d8cdb5' } : undefined}
            className={`h-2 rounded-full ${step === 1 ? 'bg-coral w-[22px]' : 'w-2'}`}
          />
        </View>
        <PressScale
          onPress={() => (step === 0 ? setStep(1) : finish())}
          className="bg-coral rounded-2xl px-8 py-4"
        >
          <Text className="text-[15px] font-bold text-white">{step === 0 ? 'Próximo' : 'Começar'}</Text>
        </PressScale>
      </View>
    </SafeAreaView>
  );
}
