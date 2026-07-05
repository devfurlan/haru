import { useState } from 'react';
import { Pressable, View, type TextInputProps } from 'react-native';

import { EyeIcon } from '@/components/eye-icon';
import { TextInput } from '@/components/text';

// Campo de senha com olhinho de mostrar/ocultar. A borda/foco ficam no container pra o
// olho ficar dentro da moldura; `className` estiliza só o input interno (padding/texto),
// então cada tela mantém sua densidade passando o próprio className.
export function PasswordInput({
  className,
  containerClassName = 'rounded-[14px]',
  ...props
}: TextInputProps & { containerClassName?: string }) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <View
      className={`bg-paper flex-row items-center pr-2.5 ${containerClassName} ${
        focused ? 'border-green-deep border-[1.5px]' : 'border-edge border'
      }`}
    >
      <TextInput
        className={`text-ink flex-1 ${className ?? 'px-4 py-[15px] text-base'}`}
        placeholderTextColor="#9aa89e"
        secureTextEntry={!show}
        autoCapitalize="none"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      />
      <Pressable onPress={() => setShow((v) => !v)} hitSlop={8} className="p-2">
        <EyeIcon off={show} color="#9aa89e" />
      </Pressable>
    </View>
  );
}
