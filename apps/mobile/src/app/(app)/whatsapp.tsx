import { maskPhoneBRInput } from '@haru/shared';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PressScale } from '@/components/press-scale';
import { Text, TextInput } from '@/components/text';
import { api, ApiError } from '@/lib/api';

const fraunces = { fontFamily: 'Fraunces_600SemiBold' };
const INPUT = 'border-edge bg-paper text-ink rounded-[14px] border px-4 py-[15px] text-base';

// Onboarding de quem entrou com Google (sem telefone): captura o WhatsApp uma vez, salvo
// como PENDENTE (sem SMS), pra a conta ficar completa. A partir daí o agendamento
// pré-preenche e nunca mais pede "Seus dados". `next` = pra onde voltar (ex.: /book/slug).
export default function WhatsappScreen() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = phone.replace(/\D/g, '').length >= 10 && !busy;

  async function save() {
    setError(null);
    setBusy(true);
    try {
      await api.setPendingPhone(phone);
      const dest = typeof next === 'string' && next.startsWith('/') ? next : '/';
      router.replace(dest as Href);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar.');
      setBusy(false);
    }
  }

  return (
    <SafeAreaView className="bg-cream flex-1" edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior="padding" className="flex-1 justify-between px-6 pt-14">
        <View>
          <Text style={fraunces} className="text-ink text-[26px] leading-[32px]">
            Só falta seu WhatsApp
          </Text>
          <Text className="text-muted mt-2.5 text-[14.5px] leading-[22px]">
            É por ele que você recebe a confirmação e os lembretes dos seus agendamentos. Assim a
            gente não pede de novo a cada vez.
          </Text>

          <Text className="text-ink mb-1.5 mt-7 text-xs font-semibold">WhatsApp</Text>
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
          {error ? <Text className="text-destructive mt-3 text-sm">{error}</Text> : null}
        </View>

        <PressScale
          disabled={!canSave}
          onPress={save}
          className={`mb-[18px] items-center rounded-2xl py-4 ${canSave ? 'bg-coral' : 'bg-coral/50'}`}
        >
          {busy ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-base font-bold text-white">Salvar e continuar</Text>
          )}
        </PressScale>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
