import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

// Marca de "primeiro acesso" - persiste que o usuário já viu o onboarding.
const KEY = 'demandae:onboarded';

export async function markOnboarded() {
  try {
    await AsyncStorage.setItem(KEY, '1');
  } catch {
    // Falha de storage não pode prender o usuário no onboarding; segue o baile.
  }
}

// Retorna null enquanto lê o storage (mostra splash), depois boolean resolvido.
export function useOnboarded() {
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => setOnboarded(v === '1'))
      .catch(() => setOnboarded(true)); // erro de leitura: não trava o acesso
  }, []);
  return onboarded;
}
