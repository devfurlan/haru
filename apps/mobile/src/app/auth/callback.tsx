import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Text } from '@/components/text';
import { completeOAuth } from '@/lib/google-auth';

/**
 * Retorno do OAuth do Google no Android: o SO roteia o deep-link
 * demandae://auth/callback?code=... pra cá (no iOS quem captura é o
 * openAuthSessionAsync em lib/google-auth). Troca o code por sessão; no sucesso
 * o guard de (app) leva pro app, no erro mostra o motivo (ex.: e-mail já tem
 * conta com senha) em vez de voltar pro login em silêncio.
 */
export default function AuthCallback() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let done = false;
    (async () => {
      const res =
        typeof code === 'string'
          ? await completeOAuth(code)
          : ({ error: 'Retorno do Google inválido.' } as const);
      if (done) return;
      if ('error' in res) setError(res.error);
      else router.replace('/');
    })();
    return () => {
      done = true;
    };
  }, [code]);

  if (error) {
    return (
      <View className="bg-paper flex-1 items-center justify-center gap-5 p-8">
        <Text className="text-ink text-center text-base leading-6">{error}</Text>
        <Pressable onPress={() => router.replace('/login')} className="rounded-2xl px-5 py-3">
          <Text className="text-coral text-[15px] font-bold">Voltar ao login</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="bg-paper flex-1 items-center justify-center">
      <ActivityIndicator color="#1f2d28" />
    </View>
  );
}
