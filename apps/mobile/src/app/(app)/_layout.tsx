import { Redirect, Stack } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '@/lib/auth';
import { registerForPush } from '@/lib/push';

export default function AppLayout() {
  const { session, loading } = useAuth();

  // Registra o dispositivo pra push assim que houver sessão (best-effort).
  useEffect(() => {
    if (session) registerForPush();
  }, [session]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-cream">
        <ActivityIndicator color="#0e7a45" />
      </View>
    );
  }
  if (!session) return <Redirect href="/login" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
