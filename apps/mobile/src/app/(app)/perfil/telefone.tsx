import { maskPhoneBRInput } from '@haru/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PressScale } from '@/components/press-scale';
import { ScreenHeader } from '@/components/screen-header';
import { Text, TextInput } from '@/components/text';
import { api, ApiError } from '@/lib/api';

const INPUT = 'border-edge bg-paper text-ink rounded-[13px] border px-4 py-[14px] text-base';

// Troca/confirma o telefone com OTP por SMS (Twilio Verify), em 2 passos: envia o
// código pro número informado, depois confirma. Serve tanto pra trocar quanto pra
// confirmar o telefone pela 1ª vez (conta ainda sem número verificado).
export default function TelefoneScreen() {
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phoneDigits = phone.replace(/\D/g, '');
  const canSend = phoneDigits.length >= 10 && !busy;
  const canConfirm = code.replace(/\D/g, '').length >= 4 && !busy;

  async function sendCode() {
    setError(null);
    setBusy(true);
    try {
      await api.sendPhoneCode(phone);
      setStep('code');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível enviar o código.');
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setError(null);
    setBusy(true);
    try {
      await api.changePhone(phone, code);
      router.back();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível confirmar.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView className="bg-cream flex-1" edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScreenHeader title="Telefone" eyebrow="Conta" />

        <View className="flex-1 px-6 pt-3">
          {step === 'phone' ? (
            <>
              <Text className="text-muted mb-5 text-[14.5px] leading-[22px]">
                Enviamos um código por SMS pra confirmar que o número é seu.
              </Text>
              <Text className="text-ink mb-1.5 text-xs font-semibold">Novo número</Text>
              <TextInput
                className={INPUT}
                value={phone}
                onChangeText={(t) => setPhone(maskPhoneBRInput(t))}
                placeholder="(11) 91234-5678"
                placeholderTextColor="#9aa89e"
                keyboardType="phone-pad"
                inputMode="tel"
                autoFocus
              />
            </>
          ) : (
            <>
              <Text className="text-muted mb-5 text-[14.5px] leading-[22px]">
                Digite o código de 6 dígitos enviado para{' '}
                <Text className="text-ink font-semibold">{phone}</Text>.
              </Text>
              <Text className="text-ink mb-1.5 text-xs font-semibold">Código</Text>
              <TextInput
                className={`${INPUT} text-center tracking-[8px]`}
                value={code}
                onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                placeholderTextColor="#9aa89e"
                keyboardType="number-pad"
                inputMode="numeric"
                autoFocus
                maxLength={6}
              />
              <View className="mt-4 flex-row items-center justify-between">
                <Pressable onPress={() => setStep('phone')} hitSlop={8}>
                  <Text className="text-muted text-[13px]">Trocar número</Text>
                </Pressable>
                <Pressable onPress={sendCode} disabled={busy} hitSlop={8}>
                  <Text className="text-coral text-[13px] font-semibold">Reenviar código</Text>
                </Pressable>
              </View>
            </>
          )}

          {error ? <Text className="text-destructive mt-4 text-sm">{error}</Text> : null}
        </View>

        <View className="bg-cream px-6 pb-[34px] pt-3">
          {step === 'phone' ? (
            <PressScale
              disabled={!canSend}
              onPress={sendCode}
              className={`items-center rounded-2xl py-4 ${canSend ? 'bg-coral' : 'bg-coral/50'}`}
            >
              {busy ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-base font-bold text-white">Enviar código</Text>
              )}
            </PressScale>
          ) : (
            <PressScale
              disabled={!canConfirm}
              onPress={confirm}
              className={`items-center rounded-2xl py-4 ${canConfirm ? 'bg-coral' : 'bg-coral/50'}`}
            >
              {busy ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-base font-bold text-white">Confirmar</Text>
              )}
            </PressScale>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
