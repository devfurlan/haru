import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Animated, Easing, View, type ViewStyle } from 'react-native';

// Placeholder com shimmer (design de micro-interações B): base creme-escura + um
// brilho que varre da esquerda pra direita em loop (1.4s). Tamanho/raio vêm por
// className. Usado no lugar de um spinner solto enquanto o conteúdo carrega.
export function Skeleton({ className, style }: { className?: string; style?: ViewStyle }) {
  const [w, setW] = useState(0);
  const [x] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(x, {
        toValue: 1,
        duration: 1400,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [x]);

  const translateX = x.interpolate({ inputRange: [0, 1], outputRange: [-w, w] });

  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      className={className}
      style={[{ overflow: 'hidden', backgroundColor: '#efe7d3' }, style]}
    >
      {w > 0 ? (
        <Animated.View
          style={{ position: 'absolute', top: 0, bottom: 0, width: '65%', transform: [{ translateX }] }}
        >
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.55)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ flex: 1 }}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}
