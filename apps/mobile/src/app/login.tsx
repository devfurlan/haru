import { Link, Redirect } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EyeIcon } from '@/components/eye-icon';
import { GoogleAuthButton } from '@/components/google-auth-button';
import { Logo } from '@/components/logo';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const { session, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Já logado: sai da tela de login pro app.
  if (!authLoading && session) return <Redirect href="/" />;

  async function handleSignIn() {
    setError(null);
    setSubmitting(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        // Distingue credencial inválida (400) de falha de rede - senão qualquer erro
        // vira "senha errada" e confunde (ex.: backend fora do ar / device sem alcance).
        const invalid =
          signInError.status === 400 || signInError.code === 'invalid_credentials';
        setError(
          invalid
            ? 'E-mail ou senha incorretos.'
            : `Sem conexão com o servidor (${signInError.message}). Confira se o backend está no ar e o celular o alcança.`,
        );
      }
      // Sucesso: onAuthStateChange atualiza a sessão e o <Redirect> acima leva pro app.
    } catch {
      setError('Sem conexão com o servidor. Confira o backend e a conexão do celular.');
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = email.trim().length > 3 && password.length >= 1 && !submitting;

  return (
    <SafeAreaView className="bg-cream flex-1">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-center px-6"
      >
        <View className="mb-1">
          <Logo size="xl" />
        </View>
        <Text className="text-muted mb-8 text-base">Entre para ver seus agendamentos</Text>

        <Text className="text-ink-soft mb-1 text-sm font-medium">E-mail</Text>
        <TextInput
          className="border-ink/10 bg-paper text-ink mb-4 rounded-xl border px-4 py-3 text-base"
          value={email}
          onChangeText={setEmail}
          placeholder="voce@email.com"
          placeholderTextColor="#9aa8a0"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          inputMode="email"
        />

        <Text className="text-ink-soft mb-1 text-sm font-medium">Senha</Text>
        <View className="mb-6 flex-row items-center rounded-xl border border-ink/10 bg-paper pr-2">
          <TextInput
            className="text-ink flex-1 px-4 py-3 text-base"
            value={password}
            onChangeText={setPassword}
            placeholder="Sua senha"
            placeholderTextColor="#9aa8a0"
            secureTextEntry={!showPassword}
            autoComplete="current-password"
            autoCapitalize="none"
          />
          <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8} className="p-2">
            <EyeIcon off={showPassword} />
          </Pressable>
        </View>

        {error ? <Text className="text-destructive mb-4 text-sm">{error}</Text> : null}

        <Pressable
          disabled={!canSubmit}
          onPress={handleSignIn}
          className={`items-center rounded-xl py-4 ${canSubmit ? 'bg-coral' : 'bg-coral/50'}`}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-base font-semibold text-white">Entrar</Text>
          )}
        </Pressable>

        <View className="my-5 flex-row items-center gap-3">
          <View className="bg-ink/10 h-px flex-1" />
          <Text className="text-muted text-xs">ou</Text>
          <View className="bg-ink/10 h-px flex-1" />
        </View>

        <GoogleAuthButton onError={setError} />

        <Link href="/signup" asChild>
          <Pressable className="mt-6">
            <Text className="text-muted text-center text-sm">Ainda não tem conta? Criar conta</Text>
          </Pressable>
        </Link>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
