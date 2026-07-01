import { Text, View } from 'react-native';

// Wordmark "Demandaê" da marca: "ê" em coral + bolinha coral com halo, em Fraunces
// (a mesma serif do web). Espelha apps/web/src/components/logo.tsx.
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
        style={{ fontFamily: 'Fraunces_700Bold', fontSize: font, letterSpacing: -1 }}
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
