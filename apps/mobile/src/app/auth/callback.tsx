import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { completeOAuth } from '@/lib/google-auth';

/**
 * Retorno do OAuth do Google no Android: o SO roteia o deep-link
 * demandae://auth/callback?code=... pra cá (no iOS quem captura é o
 * openAuthSessionAsync em lib/google-auth). Troca o code por sessão e sai:
 * com sessão, o guard de (app) leva pro app; sem, volta pro login.
 */
export default function AuthCallback() {
  const { code } = useLocalSearchParams<{ code?: string }>();

  useEffect(() => {
    let done = false;
    (async () => {
      if (typeof code === 'string') await completeOAuth(code);
      if (!done) router.replace('/');
    })();
    return () => {
      done = true;
    };
  }, [code]);

  return (
    <View className="bg-paper flex-1 items-center justify-center">
      <ActivityIndicator color="#1f2d28" />
    </View>
  );
}
