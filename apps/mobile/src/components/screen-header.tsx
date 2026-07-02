import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/text';

// Cabeçalho das telas empilhadas do perfil: botão voltar (caixa "paper") + título
// Fraunces, com um rótulo pequeno opcional acima. Mesmo padrão do signup/esqueci-senha.
export function ScreenHeader({ title, eyebrow }: { title: string; eyebrow?: string }) {
  const router = useRouter();
  return (
    <View className="px-6 pb-2 pt-6">
      <Pressable
        onPress={() => router.back()}
        hitSlop={8}
        className="bg-paper h-[42px] w-[42px] items-center justify-center rounded-[14px] border border-[#ece3cf] active:opacity-70"
      >
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Path
            d="M15 5l-7 7 7 7"
            stroke="#0A3324"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Pressable>

      {eyebrow ? <Text className="text-muted mt-[18px] text-sm">{eyebrow}</Text> : null}
      <Text
        style={{ fontFamily: 'Fraunces_500Medium', letterSpacing: -0.5 }}
        className={`text-ink text-[28px] ${eyebrow ? 'mt-0.5' : 'mt-[18px]'}`}
      >
        {title}
      </Text>
    </View>
  );
}
