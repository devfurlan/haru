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
      await api.signup({ email: email.trim(), password, name: name.trim(), phone, acceptTerms: accepted });
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
    <SafeAreaView className="flex-1 bg-cream">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView contentContainerClassName="px-6 py-8">
          <Text className="mb-1 text-3xl font-bold text-ink">Criar conta</Text>
          <Text className="mb-6 text-base text-muted">
            Pra agilizar seus agendamentos e receber lembretes.
          </Text>

          <Field label="Nome">
            <TextInput
              className="rounded-xl border border-ink/10 bg-paper px-4 py-3 text-base text-ink"
              value={name}
              onChangeText={setName}
              placeholder="Seu nome"
              placeholderTextColor="#9aa8a0"
            />
          </Field>

          <Field label="E-mail">
            <TextInput
              className="rounded-xl border border-ink/10 bg-paper px-4 py-3 text-base text-ink"
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
              className="rounded-xl border border-ink/10 bg-paper px-4 py-3 text-base text-ink"
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
              className="rounded-xl border border-ink/10 bg-paper px-4 py-3 text-base text-ink"
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
            <Text className="flex-1 text-sm text-ink-soft">
              Aceito os Termos de Uso e a Política de Privacidade.
            </Text>
          </Pressable>

          {error ? <Text className="mb-4 text-sm text-destructive">{error}</Text> : null}

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

          <Link href="/login" asChild>
            <Pressable className="mt-6">
              <Text className="text-center text-sm text-muted">Já tenho conta - entrar</Text>
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
      <Text className="mb-1 text-sm font-medium text-ink-soft">{label}</Text>
      {children}
    </View>
  );
}
