import { Link, Redirect } from 'expo-router';
import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { maskPhoneBRInput } from '@haru/shared';

import { GoogleAuthButton } from '@/components/google-auth-button';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function SignupScreen() {
  const { session, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!authLoading && session) return <Redirect href="/" />;

  async function handleSignUp() {
    setError(null);
    setSubmitting(true);
    try {
      await api.signup({
        email: email.trim(),
        password,
        name: name.trim(),
        phone,
        acceptTerms: accepted,
      });
      // Cria a conta e já entra: confirmações de e-mail estão desligadas, então o
      // signIn imediato funciona e o onAuthStateChange leva pro app.
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) setError('Conta criada. Faça login para entrar.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível criar a conta');
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit =
    email.trim().length > 3 &&
    name.trim().length >= 2 &&
    phone.replace(/\D/g, '').length >= 10 &&
    password.length >= 8 &&
    accepted &&
    !submitting;

  return (
    <SafeAreaView className="bg-cream flex-1">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView contentContainerClassName="px-6 py-8">
          <Text className="text-ink mb-1 text-3xl font-bold">Criar conta</Text>
          <Text className="text-muted mb-6 text-base">
            Pra agilizar seus agendamentos e receber lembretes.
          </Text>

          <Field label="Nome">
            <TextInput
              className="border-ink/10 bg-paper text-ink rounded-xl border px-4 py-3 text-base"
              value={name}
              onChangeText={setName}
              placeholder="Seu nome"
              placeholderTextColor="#9aa8a0"
            />
          </Field>

          <Field label="E-mail">
            <TextInput
              className="border-ink/10 bg-paper text-ink rounded-xl border px-4 py-3 text-base"
              value={email}
              onChangeText={setEmail}
              placeholder="voce@email.com"
              placeholderTextColor="#9aa8a0"
              autoCapitalize="none"
              keyboardType="email-address"
              inputMode="email"
            />
          </Field>

          <Field label="WhatsApp">
            <TextInput
              className="border-ink/10 bg-paper text-ink rounded-xl border px-4 py-3 text-base"
              value={phone}
              onChangeText={(t) => setPhone(maskPhoneBRInput(t))}
              placeholder="(11) 91234-5678"
              placeholderTextColor="#9aa8a0"
              keyboardType="phone-pad"
              inputMode="tel"
            />
          </Field>

          <Field label="Senha">
            <TextInput
              className="border-ink/10 bg-paper text-ink rounded-xl border px-4 py-3 text-base"
              value={password}
              onChangeText={setPassword}
              placeholder="Ao menos 8 caracteres"
              placeholderTextColor="#9aa8a0"
              secureTextEntry
            />
          </Field>

          <Pressable
            onPress={() => setAccepted((v) => !v)}
            className="mb-6 mt-1 flex-row items-center gap-3"
          >
            <View
              className={`h-6 w-6 items-center justify-center rounded-md border ${
                accepted ? 'border-green bg-green' : 'border-ink/30 bg-paper'
              }`}
            >
              {accepted ? <Text className="text-xs font-bold text-white">✓</Text> : null}
            </View>
            <Text className="text-ink-soft flex-1 text-sm">
              Aceito os Termos de Uso e a Política de Privacidade.
            </Text>
          </Pressable>

          {error ? <Text className="text-destructive mb-4 text-sm">{error}</Text> : null}

          <Pressable
            disabled={!canSubmit}
            onPress={handleSignUp}
            className={`items-center rounded-xl py-4 ${canSubmit ? 'bg-coral' : 'bg-coral/50'}`}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-base font-semibold text-white">Criar conta</Text>
            )}
          </Pressable>

          <View className="my-5 flex-row items-center gap-3">
            <View className="bg-ink/10 h-px flex-1" />
            <Text className="text-muted text-xs">ou</Text>
            <View className="bg-ink/10 h-px flex-1" />
          </View>

          <GoogleAuthButton onError={setError} />
          <Text className="text-muted mt-3 text-center text-xs">
            Ao continuar com Google, você aceita os Termos de Uso e a Política de Privacidade.
          </Text>

          <Link href="/login" asChild>
            <Pressable className="mt-6">
              <Text className="text-muted text-center text-sm">Já tenho conta - entrar</Text>
            </Pressable>
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="mb-4">
      <Text className="text-ink-soft mb-1 text-sm font-medium">{label}</Text>
      {children}
    </View>
  );
}
