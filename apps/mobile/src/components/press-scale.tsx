import { cssInterop } from 'nativewind';
import { useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { tapLight } from '@/lib/haptics';

// Botão/área tocável com a micro-interação do design: no toque, encolhe pra 0.955
// em 120ms (ease-out) e volta ao soltar, com haptic leve. Substitui o `active:scale`
// do NativeWind (que é instantâneo) por um movimento suave.
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
// Registra className -> style no componente animado (NativeWind não intercepta
// componentes criados via createAnimatedComponent automaticamente).
cssInterop(AnimatedPressable, { className: 'style' });

type Props = Omit<PressableProps, 'style'> & {
  className?: string;
  haptic?: boolean;
  scaleTo?: number;
  style?: StyleProp<ViewStyle>;
};

export function PressScale({
  haptic = true,
  scaleTo = 0.955,
  disabled,
  onPressIn,
  onPressOut,
  style,
  ...props
}: Props) {
  const [scale] = useState(() => new Animated.Value(1));
  const animateTo = (value: number) =>
    Animated.timing(scale, {
      toValue: value,
      duration: 120,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

  return (
    <AnimatedPressable
      disabled={disabled}
      onPressIn={(e) => {
        if (!disabled) {
          animateTo(scaleTo);
          if (haptic) tapLight();
        }
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        animateTo(1);
        onPressOut?.(e);
      }}
      style={[{ transform: [{ scale }] }, style]}
      {...props}
    />
  );
}
