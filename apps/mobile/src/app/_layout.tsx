import {
  Fraunces_500Medium,
  Fraunces_500Medium_Italic,
  Fraunces_600SemiBold,
  Fraunces_600SemiBold_Italic,
  Fraunces_700Bold,
  useFonts,
} from '@expo-google-fonts/fraunces';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/lib/auth';
import { hankenFonts } from '@/lib/fonts';

import '../global.css';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Fonte serif da marca (Fraunces) para títulos/preços/acentos emocionais. Medium e
  // SemiBold nos displays; os itálicos coloridos são a "voz" do design (palavra em
  // destaque italic + coral/verde). Vem embutida (@expo-google-fonts).
  const [fontsLoaded] = useFonts({
    Fraunces_500Medium,
    Fraunces_500Medium_Italic,
    Fraunces_600SemiBold,
    Fraunces_600SemiBold_Italic,
    Fraunces_700Bold,
    ...hankenFonts,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null; // segura no splash até a fonte carregar

  return (
    <AuthProvider>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#faf5ea' } }} />
      </SafeAreaProvider>
    </AuthProvider>
  );
}
