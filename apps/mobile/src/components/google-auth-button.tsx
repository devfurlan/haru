import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { signInWithGoogle } from '@/lib/google-auth';

/**
 * "Continuar com Google" - um botão só serve login e cadastro. No sucesso, o
 * onAuthStateChange (lib/auth) troca a sessão e o <Redirect> das telas leva pro app.
 * Erros sobem pelo `onError` pro parent mostrar na mesma área dos outros erros.
 */
export function GoogleAuthButton({ onError }: { onError?: (message: string) => void }) {
  const [submitting, setSubmitting] = useState(false);

  async function handlePress() {
    onError?.('');
    setSubmitting(true);
    const result = await signInWithGoogle();
    setSubmitting(false);
    if ('error' in result) onError?.(result.error);
    // ok: redirect via onAuthStateChange. canceled: usuário fechou, sem erro.
  }

  return (
    <Pressable
      disabled={submitting}
      onPress={handlePress}
      className={`border-ink/15 bg-paper flex-row items-center justify-center gap-3 rounded-xl border py-4 ${
        submitting ? 'opacity-60' : ''
      }`}
    >
      {submitting ? (
        <ActivityIndicator color="#1f2d28" />
      ) : (
        <>
          <View className="border-ink/15 h-5 w-5 items-center justify-center rounded-full border">
            <Text className="text-ink text-xs font-bold">G</Text>
          </View>
          <Text className="text-ink text-base font-semibold">Continuar com Google</Text>
        </>
      )}
    </Pressable>
  );
}
