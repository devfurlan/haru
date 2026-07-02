import { Image } from 'expo-image';
import { View } from 'react-native';

import { Text } from '@/components/text';

// Logo do estabelecimento; sem logo, cai num quadrado com a inicial do nome.
export function TenantAvatar({
  name,
  logoUrl,
  size = 56,
  radius = 16,
  fill = false,
}: {
  name: string;
  logoUrl?: string | null;
  size?: number;
  radius?: number;
  // fill: ocupa todo o box do pai (cantos vêm do overflow-hidden do container)
  fill?: boolean;
}) {
  const dims = fill
    ? { width: '100%' as const, height: '100%' as const }
    : { width: size, height: size, borderRadius: radius };
  if (logoUrl) {
    return <Image source={{ uri: logoUrl }} style={dims} contentFit="cover" transition={150} />;
  }
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <View style={dims} className="bg-coral/10 items-center justify-center">
      <Text style={{ fontFamily: 'Fraunces_700Bold', fontSize: size * 0.4 }} className="text-coral">
        {initial}
      </Text>
    </View>
  );
}
