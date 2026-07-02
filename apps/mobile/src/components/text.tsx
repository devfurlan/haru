import { forwardRef, type ComponentRef } from 'react';
import {
  Text as RNText,
  TextInput as RNTextInput,
  StyleSheet,
  type TextProps,
  type TextInputProps,
  type TextStyle,
} from 'react-native';

import { hankenForWeight } from '@/lib/fonts';

// Hanken Grotesk é a fonte-padrão de UI. Como o RN não tem herança de fonte fora
// de <Text> aninhado, aplicamos Hanken em cada Text/TextInput. O peso pedido vira
// a instância estática correta (evita faux-bold no Android). Texto que já define
// `fontFamily` no style (ex.: Fraunces, ou o "ê" do wordmark) é respeitado.
// className continua funcionando: repassamos ao Text/TextInput do RN, que o
// NativeWind intercepta normalmente.
function withHanken(style: TextProps['style']): TextProps['style'] {
  const flat = (StyleSheet.flatten(style) as TextStyle) || {};
  if (flat.fontFamily) return style; // fonte explícita: não mexe
  const { fontWeight, ...rest } = flat;
  return [{ fontFamily: hankenForWeight(fontWeight) }, rest];
}

export const Text = forwardRef<ComponentRef<typeof RNText>, TextProps>(function Text(
  { style, ...props },
  ref,
) {
  return <RNText ref={ref} style={withHanken(style)} {...props} />;
});

export const TextInput = forwardRef<ComponentRef<typeof RNTextInput>, TextInputProps>(
  function TextInput({ style, ...props }, ref) {
    return <RNTextInput ref={ref} style={withHanken(style)} {...props} />;
  },
);
