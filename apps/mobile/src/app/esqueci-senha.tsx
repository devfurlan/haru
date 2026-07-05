import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Logo } from '@/components/logo';
import { PressScale } from '@/components/press-scale';
import { Text, TextInput } from '@/components/text';
import { supabase } from '@/lib/supabase';

/**
 * Recuperação de senha. Dispara o e-mail de reset do Supabase; o link do e-mail
 * (template token_hash, ver supabase/templates/recovery.html) abre a página web
 * /redefinir-senha - onde a nova senha é definida. O usuário volta ao app e entra
 * com a senha nova. Por isso não há tela de "nova senha" nem deep-link aqui.
 */
export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(emailParam ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      // redirectTo omitido de propósito: o template de recovery usa {{ .SiteURL }}
      // (domínio web), não o RedirectTo. Sempre "ok", mesmo se o e-mail não existir,
      // pra não vazar quais e-mails têm conta (enumeração).
      await supabase.auth.resetPasswordForEmail(email.trim());
      setSent(true);
    } catch {
      setError('Sem conexão com o servidor. Confira o backend e a conexão do celular.');
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = email.trim().length > 3 && !submitting;

  return (
    <SafeAreaView className="bg-cream flex-1" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior="padding"
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="grow px-6 pb-6 pt-1.5"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Voltar pro login */}
          <Pressable
            onPress={() => router.back()}
            className="bg-paper h-[42px] w-[42px] items-center justify-center rounded-[14px] border border-[#ece3cf]"
          >
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

          <View className="grow justify-center">
            <Logo size="md" />

            <Text
              className="text-ink mt-[26px]"
              style={{ fontFamily: 'Fraunces_500Medium', fontSize: 30, lineHeight: 33, letterSpacing: -0.5 }}
            >
              Recuperar{' '}
              <Text className="text-green-deep" style={{ fontFamily: 'Fraunces_500Medium_Italic' }}>
                senha
              </Text>
            </Text>

            {sent ? (
              <Text className="text-muted mt-2.5 text-[15px] leading-6">
                Se houver uma conta com esse e-mail, enviamos um link pra você definir uma nova
                senha. Confira sua caixa de entrada (e o spam). Depois é só voltar aqui e entrar.
              </Text>
            ) : (
              <>
                <Text className="text-muted mt-2.5 text-[15px] leading-6">
                  Informe seu e-mail e enviamos um link pra você criar uma nova senha.
                </Text>

                <View className="mt-[26px]">
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
                    onSubmitEditing={() => canSubmit && handleSubmit()}
                    returnKeyType="send"
                  />
                </View>
              </>
            )}

            {error ? <Text className="text-destructive mt-4 text-sm">{error}</Text> : null}
          </View>

          <View className="mt-6">
            {sent ? (
              <Link href="/login" asChild>
                <PressScale className="bg-coral items-center rounded-2xl py-[17px]">
                  <Text className="text-base font-bold text-white">Voltar ao login</Text>
                </PressScale>
              </Link>
            ) : (
              <PressScale
                disabled={!canSubmit}
                onPress={handleSubmit}
                className={`items-center rounded-2xl py-[17px] ${canSubmit ? 'bg-coral' : 'bg-coral/50'}`}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text className="text-base font-bold text-white">Enviar link</Text>
                )}
              </PressScale>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
