// Import por SUBPATH (não pelo root): o index.js do pacote faz `require()` de TODOS os
// pesos, então importar do root embutia ~17 fontes por família (todos os pesos + itálicos)
// no bundle do app. O subpath por peso embute só o .ttf de fato usado.
import { HankenGrotesk_400Regular } from '@expo-google-fonts/hanken-grotesk/400Regular';
import { HankenGrotesk_500Medium } from '@expo-google-fonts/hanken-grotesk/500Medium';
import { HankenGrotesk_600SemiBold } from '@expo-google-fonts/hanken-grotesk/600SemiBold';
import { HankenGrotesk_700Bold } from '@expo-google-fonts/hanken-grotesk/700Bold';
import { HankenGrotesk_800ExtraBold } from '@expo-google-fonts/hanken-grotesk/800ExtraBold';

// Fontes da marca "Demandaê" (design Claude):
// - Fraunces (serif) = display, preços, acentos emocionais. Aplicada via
//   `style={{ fontFamily: 'Fraunces_...' }}` explícito nas telas.
// - Hanken Grotesk = TODO o resto (corpo, UI, botões, chips, labels). O RN não
//   tem fonte-padrão global nem herança fora de <Text> aninhado, então usamos os
//   wrappers <Text>/<TextInput> de `@/components/text`, que aplicam Hanken por
//   padrão mapeando o peso para a instância estática correta (evita faux-bold).
export const hankenFonts = {
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
  HankenGrotesk_800ExtraBold,
};

const BY_WEIGHT: Record<string, string> = {
  '100': 'HankenGrotesk_400Regular',
  '200': 'HankenGrotesk_400Regular',
  '300': 'HankenGrotesk_400Regular',
  '400': 'HankenGrotesk_400Regular',
  '500': 'HankenGrotesk_500Medium',
  '600': 'HankenGrotesk_600SemiBold',
  '700': 'HankenGrotesk_700Bold',
  '800': 'HankenGrotesk_800ExtraBold',
  '900': 'HankenGrotesk_800ExtraBold',
  normal: 'HankenGrotesk_400Regular',
  bold: 'HankenGrotesk_700Bold',
};

// Peso (número/'bold'/'normal'/undefined) -> família estática do Hanken.
export function hankenForWeight(weight?: string | number | null): string {
  return BY_WEIGHT[String(weight ?? '400')] ?? 'HankenGrotesk_400Regular';
}
