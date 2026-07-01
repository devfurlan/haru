import { Platform, Text, View } from 'react-native';

// Wordmark "Demandaê" da marca: "ê" em coral + bolinha coral com halo, em serif.
// Espelha apps/web/src/components/logo.tsx (lá é Fraunces; aqui usamos o serif do
// sistema pra não precisar embutir a fonte).
const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: undefined });

const SIZES = {
  md: { font: 26, dot: 8 },
  lg: { font: 34, dot: 10 },
  xl: { font: 44, dot: 12 },
} as const;

export function Logo({ size = 'lg' }: { size?: keyof typeof SIZES }) {
  const { font, dot } = SIZES[size];
  const halo = dot + 8;
  return (
    <View className="flex-row items-center">
      <Text
        style={{ fontFamily: serif, fontSize: font, fontWeight: '900', letterSpacing: -1 }}
        className="text-ink"
      >
        Demanda<Text className="text-coral">ê</Text>
      </Text>
      <View
        className="bg-coral/20 ml-2 items-center justify-center rounded-full"
        style={{ width: halo, height: halo }}
      >
        <View className="bg-coral rounded-full" style={{ width: dot, height: dot }} />
      </View>
    </View>
  );
}
