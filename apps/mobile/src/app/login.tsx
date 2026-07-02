import { Link, Redirect } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EyeIcon } from '@/components/eye-icon';
import { GoogleAuthButton } from '@/components/google-auth-button';
import { Logo } from '@/components/logo';
import { PressScale } from '@/components/press-scale';
import { Text, TextInput } from '@/components/text';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const { session, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
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
    <SafeAreaView className="bg-cream flex-1" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="grow px-6 pb-6 pt-1"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="grow justify-center">
            <Logo size="md" />

            <Text
              className="text-ink mt-[26px]"
              style={{ fontFamily: 'Fraunces_500Medium', fontSize: 30, lineHeight: 33, letterSpacing: -0.5 }}
            >
              Que bom{' '}
              <Text className="text-green-deep" style={{ fontFamily: 'Fraunces_500Medium_Italic' }}>
                te ver
              </Text>
            </Text>
            <Text className="text-muted mt-2.5 text-[15px] leading-6">
              Entra pra ver seus agendamentos e marcar em segundos.
            </Text>

            <View className="mt-[26px] gap-[13px]">
              <View>
                <Text className="text-ink mb-1.5 text-[12.5px] font-semibold">E-mail</Text>
                <TextInput
                  className="border-edge bg-paper text-ink rounded-[14px] border px-4 py-[15px] text-base"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="voce@email.com"
                  placeholderTextColor="#9aa8a0"
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  inputMode="email"
                />
              </View>

              <View>
                <Text className="text-ink mb-1.5 text-[12.5px] font-semibold">Senha</Text>
                <View
                  className={`bg-paper flex-row items-center rounded-[14px] pr-2.5 ${passwordFocused ? 'border-green-deep border-[1.5px]' : 'border-edge border'}`}
                >
                  <TextInput
                    className="text-ink flex-1 px-4 py-[15px] text-base"
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    placeholder="Sua senha"
                    placeholderTextColor="#9aa8a0"
                    secureTextEntry={!showPassword}
                    autoComplete="current-password"
                    autoCapitalize="none"
                  />
                  <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8} className="p-2">
                    <EyeIcon off={showPassword} color="#9aa89e" />
                  </Pressable>
                </View>
              </View>

              <Link href="/esqueci-senha" asChild>
                <Pressable className="self-end" hitSlop={8}>
                  <Text className="text-green-deep text-[12.5px] font-semibold">
                    Esqueci a senha
                  </Text>
                </Pressable>
              </Link>
            </View>

            {error ? <Text className="text-destructive mt-4 text-sm">{error}</Text> : null}
          </View>

          <View className="mt-6">
            <PressScale
              disabled={!canSubmit}
              onPress={handleSignIn}
              className={`items-center rounded-2xl py-[17px] ${canSubmit ? 'bg-coral' : 'bg-coral/50'}`}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-base font-bold text-white">Entrar</Text>
              )}
            </PressScale>

            <View className="my-[18px] flex-row items-center gap-3">
              <View className="bg-edge h-px flex-1" />
              <Text className="text-xs" style={{ color: '#9aa89e' }}>
                ou
              </Text>
              <View className="bg-edge h-px flex-1" />
            </View>

            <GoogleAuthButton onError={setError} label="Entrar com Google" />

            <Link href="/signup" asChild>
              <Pressable className="mt-5">
                <Text className="text-sub text-center text-[13px] font-medium">
                  Novo por aqui? <Text className="text-coral font-bold">Criar conta</Text>
                </Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
