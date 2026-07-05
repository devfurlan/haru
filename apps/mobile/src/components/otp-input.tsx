import { useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Text } from '@/components/text';

// OTP de N células (padrão nativo): um TextInput invisível captura o código inteiro
// e as células são só a pintura por cima. Tocar em qualquer lugar foca o input.
// Equivalente ao input-otp do shadcn, que é web-only (DOM).
export function OtpInput({
  value,
  onChangeText,
  length = 6,
  autoFocus,
}: {
  value: string;
  onChangeText: (v: string) => void;
  length?: number;
  autoFocus?: boolean;
}) {
  const ref = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const digits = value.split('');
  // Célula "ativa": a próxima a preencher (ou a última quando já completo).
  const active = Math.min(value.length, length - 1);

  return (
    <Pressable onPress={() => ref.current?.focus()} className="flex-row justify-between">
      {Array.from({ length }).map((_, i) => {
        const filled = i < value.length;
        const isActive = focused && i === active;
        return (
          <View
            key={i}
            className={`h-[54px] w-[46px] items-center justify-center rounded-[13px] border bg-paper ${
              isActive ? 'border-green-deep border-[1.5px]' : filled ? 'border-ink/40' : 'border-edge'
            }`}
          >
            <Text className="text-ink text-[22px] font-semibold">{digits[i] ?? ''}</Text>
          </View>
        );
      })}

      <TextInput
        ref={ref}
        value={value}
        onChangeText={(t) => onChangeText(t.replace(/\D/g, '').slice(0, length))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        inputMode="numeric"
        maxLength={length}
        autoFocus={autoFocus}
        // Fora da tela, mas montado: captura o teclado sem aparecer.
        className="absolute h-px w-px opacity-0"
      />
    </Pressable>
  );
}
