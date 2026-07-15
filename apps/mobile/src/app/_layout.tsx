// PRIMEIRA LINHA, de propósito: inicializa o Sentry antes de qualquer import que
// possa dar throw em escopo de módulo (supabase.ts/api.ts checam env e explodem).
import '@/lib/instrument';

// Import por SUBPATH (ver nota em lib/fonts.ts): o root de @expo-google-fonts embute
// todos os pesos. useFonts vem de expo-font (mesmo hook).
import { Fraunces_500Medium } from '@expo-google-fonts/fraunces/500Medium';
import { Fraunces_500Medium_Italic } from '@expo-google-fonts/fraunces/500Medium_Italic';
import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces/600SemiBold';
import { Fraunces_600SemiBold_Italic } from '@expo-google-fonts/fraunces/600SemiBold_Italic';
import { Fraunces_700Bold } from '@expo-google-fonts/fraunces/700Bold';
import * as Sentry from '@sentry/react-native';
import { useFonts } from 'expo-font';
import { ErrorBoundary as ExpoErrorBoundary, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';

import { AuthProvider } from '@/lib/auth';
import { BootProvider } from '@/lib/boot';
import { hankenFonts } from '@/lib/fonts';

import '../global.css';

SplashScreen.preventAutoHideAsync();

// Sem este wrapper o Sentry só veria o erro se ele chegasse ao ErrorUtils - o que
// frequentemente NÃO acontece, porque o React "engole" o erro tratado por um boundary.
export const ErrorBoundary = Sentry.wrapExpoRouterErrorBoundary(ExpoErrorBoundary);

function RootLayout() {
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
      <BootProvider>
        {/* initialMetrics: insets síncronos no 1º frame - sem isso a tela pinta
            uma vez com insets 0 (conteúdo sob a status bar/notch) e só depois "pula". */}
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#faf5ea' } }} />
        </SafeAreaProvider>
      </BootProvider>
    </AuthProvider>
  );
}

export default Sentry.wrap(RootLayout);
