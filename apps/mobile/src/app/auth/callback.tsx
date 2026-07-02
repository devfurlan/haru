import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Text } from '@/components/text';
import { completeOAuth } from '@/lib/google-auth';

/**
 * Retorno do OAuth do Google no Android (deep-link demandae://auth/callback?code=...).
 * Troca o code por sessão via completeOAuth (deduplicado com o caminho do iOS). No
 * sucesso o guard de (app) leva pro app; no erro mostra o motivo em vez de voltar pro
 * login em silêncio. `detail` é o erro cru (diagnóstico) - remover quando estabilizar.
 */
export default function AuthCallback() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const [err, setErr] = useState<{ msg: string; detail?: string } | null>(null);

  useEffect(() => {
    let done = false;
    (async () => {
      const res =
        typeof code === 'string'
          ? await completeOAuth(code)
          : ({ error: 'Retorno do Google inválido.' } as const);
      if (done) return;
      if ('error' in res) setErr({ msg: res.error, detail: 'detail' in res ? res.detail : undefined });
      else router.replace('/');
    })();
    return () => {
      done = true;
    };
  }, [code]);

  if (err) {
    return (
      <View className="bg-paper flex-1 items-center justify-center gap-4 p-8">
        <Text className="text-ink text-center text-base leading-6">{err.msg}</Text>
        {err.detail ? (
          <Text className="text-ink/50 text-center text-xs leading-5">{err.detail}</Text>
        ) : null}
        <Pressable onPress={() => router.replace('/login')} className="px-5 py-3">
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
