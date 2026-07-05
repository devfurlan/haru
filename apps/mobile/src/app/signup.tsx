import { Link, Redirect } from 'expo-router';
import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { maskPhoneBRInput } from '@haru/shared';

import { GoogleAuthButton } from '@/components/google-auth-button';
import { PasswordInput } from '@/components/password-input';
import { PressScale } from '@/components/press-scale';
import { Text, TextInput } from '@/components/text';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

const TERMS_URL = 'https://www.demandae.com/termos';
const PRIVACY_URL = 'https://www.demandae.com/privacidade';

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
        behavior="padding"
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="px-6 pt-1.5 pb-4"
          keyboardShouldPersistTaps="handled"
        >
          {/* Voltar pro login */}
          <Link href="/login" asChild>
            <Pressable className="bg-paper h-[42px] w-[42px] items-center justify-center rounded-[14px] border border-[#ece3cf]">
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M15 5l-7 7 7 7"
                  stroke="#0A3324"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </Pressable>
          </Link>

          <Text
            className="text-ink mt-[22px] text-[30px] leading-[33px]"
            style={{ fontFamily: 'Fraunces_500Medium', letterSpacing: -0.6 }}
          >
            Criar sua{' '}
            <Text className="text-green-deep" style={{ fontFamily: 'Fraunces_500Medium_Italic' }}>
              conta
            </Text>
          </Text>
          <Text className="text-muted mt-[11px] text-[14.5px] leading-[22px]">
            Leva um minuto. Depois é só marcar.
          </Text>

          <View className="mt-[18px]">
            <GoogleAuthButton onError={setError} />
          </View>

          <View className="my-4 flex-row items-center gap-3">
            <View className="bg-edge h-px flex-1" />
            <Text className="text-xs font-medium" style={{ color: '#9aa89e' }}>
              ou com e-mail
            </Text>
            <View className="bg-edge h-px flex-1" />
          </View>

          <View className="gap-3">
            <Field label="Nome">
              <TextInput
                className="border-edge bg-paper text-ink rounded-[13px] border px-4 py-[13px] text-[15px]"
                value={name}
                onChangeText={setName}
                placeholder="Seu nome"
                placeholderTextColor="#9aa89e"
              />
            </Field>

            <Field label="E-mail">
              <TextInput
                className="border-edge bg-paper text-ink rounded-[13px] border px-4 py-[13px] text-[15px]"
                value={email}
                onChangeText={setEmail}
                placeholder="seu@email.com"
                placeholderTextColor="#9aa89e"
                autoCapitalize="none"
                keyboardType="email-address"
                inputMode="email"
              />
            </Field>

            <Field label="WhatsApp">
              <TextInput
                className="border-edge bg-paper text-ink rounded-[13px] border px-4 py-[13px] text-[15px]"
                value={phone}
                onChangeText={(t) => setPhone(maskPhoneBRInput(t))}
                placeholder="(11) 91234-5678"
                placeholderTextColor="#9aa89e"
                keyboardType="phone-pad"
                inputMode="tel"
              />
            </Field>

            <Field label="Senha">
              <PasswordInput
                className="px-4 py-[13px] text-[15px]"
                containerClassName="rounded-[13px]"
                value={password}
                onChangeText={setPassword}
                placeholder="mínimo 8 caracteres"
              />
            </Field>
          </View>

          <View className="mt-4 flex-row items-center gap-3">
            <Pressable
              onPress={() => setAccepted((v) => !v)}
              hitSlop={8}
              className={`h-[22px] w-[22px] items-center justify-center rounded-md border ${
                accepted ? 'bg-green-deep border-green-deep' : 'border-edge bg-paper'
              }`}
            >
              {accepted ? <Text className="text-[11px] font-bold text-white">✓</Text> : null}
            </Pressable>
            <Text className="text-sub flex-1 text-[13px]" onPress={() => setAccepted((v) => !v)}>
              Aceito os{' '}
              <Text
                className="text-coral font-semibold underline"
                onPress={() => Linking.openURL(TERMS_URL)}
              >
                Termos de Uso
              </Text>{' '}
              e a{' '}
              <Text
                className="text-coral font-semibold underline"
                onPress={() => Linking.openURL(PRIVACY_URL)}
              >
                Política de Privacidade
              </Text>
              .
            </Text>
          </View>
        </ScrollView>

        {/* Rodapé fixo: ação principal + termos, como no mockup */}
        <View className="bg-cream px-6 pt-3 pb-[34px]">
          {error ? <Text className="text-destructive mb-3 text-sm">{error}</Text> : null}

          <PressScale
            disabled={!canSubmit}
            onPress={handleSignUp}
            className={`items-center rounded-2xl py-4 ${canSubmit ? 'bg-coral' : 'bg-coral/50'}`}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-base font-bold text-white">Criar conta</Text>
            )}
          </PressScale>

          <Link href="/login" asChild>
            <Pressable className="mt-3.5">
              <Text className="text-muted text-center text-[13px]">
                Já tenho conta <Text className="text-coral font-bold">- entrar</Text>
              </Text>
            </Pressable>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View>
      <Text className="text-ink mb-1.5 text-xs font-semibold">{label}</Text>
      {children}
    </View>
  );
}
