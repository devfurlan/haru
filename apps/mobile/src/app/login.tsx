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

import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const { session, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Já logado: sai da tela de login pro app.
  if (!authLoading && session) return <Redirect href="/" />;

  async function handleSignIn() {
    setError(null);
    setSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setSubmitting(false);
    if (signInError) setError('E-mail ou senha incorretos.');
    // Sucesso: onAuthStateChange atualiza a sessão e o <Redirect> acima leva pro app.
  }

  const canSubmit = email.trim().length > 3 && password.length >= 1 && !submitting;

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-center px-6"
      >
        <Text className="mb-1 text-4xl font-bold text-ink">Demandaê</Text>
        <Text className="mb-8 text-base text-muted">Entre para ver seus agendamentos</Text>

        <Text className="mb-1 text-sm font-medium text-ink-soft">E-mail</Text>
        <TextInput
          className="mb-4 rounded-xl border border-ink/10 bg-paper px-4 py-3 text-base text-ink"
          value={email}
          onChangeText={setEmail}
          placeholder="voce@email.com"
          placeholderTextColor="#9aa8a0"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          inputMode="email"
        />

        <Text className="mb-1 text-sm font-medium text-ink-soft">Senha</Text>
        <TextInput
          className="mb-6 rounded-xl border border-ink/10 bg-paper px-4 py-3 text-base text-ink"
          value={password}
          onChangeText={setPassword}
          placeholder="Sua senha"
          placeholderTextColor="#9aa8a0"
          secureTextEntry
          autoComplete="current-password"
        />

        {error ? <Text className="mb-4 text-sm text-destructive">{error}</Text> : null}

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

        <Link href="/signup" asChild>
          <Pressable className="mt-6">
            <Text className="text-center text-sm text-muted">Ainda não tem conta? Criar conta</Text>
          </Pressable>
        </Link>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
