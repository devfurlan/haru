import { formatPhoneBR, maskCpfCnpjInput } from '@haru/shared';
import { router, type Href } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PressScale } from '@/components/press-scale';
import { ScreenHeader } from '@/components/screen-header';
import { Text, TextInput } from '@/components/text';
import { api, ApiError, type Me } from '@/lib/api';

// "YYYY-MM-DD" (API) -> "DD/MM/AAAA" (exibição).
function ymdToBR(ymd: string | null): string {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-');
  return y && m && d ? `${d}/${m}/${y}` : '';
}
// Máscara progressiva DD/MM/AAAA a partir dos dígitos.
function maskDateBR(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean).join('/');
}
// "DD/MM/AAAA" completo -> "YYYY-MM-DD"; senão null (não envia / não altera).
function brToYMD(br: string): string | null {
  const m = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

const INPUT = 'border-edge bg-paper text-ink rounded-[13px] border px-4 py-[13px] text-[15px]';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View>
      <Text className="text-ink mb-1.5 text-xs font-semibold">{label}</Text>
      {children}
    </View>
  );
}

export default function DadosScreen() {
  const [me, setMe] = useState<Me | null>(null);
  const [name, setName] = useState('');
  const [document, setDocument] = useState('');
  const [birth, setBirth] = useState(''); // DD/MM/AAAA
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function hydrate(m: Me) {
    setMe(m);
    setName(m.name ?? '');
    setDocument(m.document ? maskCpfCnpjInput(m.document) : '');
    setBirth(ymdToBR(m.birthDate));
  }

  useEffect(() => {
    api
      .me()
      .then(hydrate)
      .catch(() => setError('Não foi possível carregar seus dados.'));
  }, []);

  const dirty =
    !!me &&
    (name.trim() !== (me.name ?? '') ||
      document !== (me.document ? maskCpfCnpjInput(me.document) : '') ||
      birth !== ymdToBR(me.birthDate));
  const canSave = !!me && name.trim().length >= 2 && dirty && !saving;

  async function handleSave() {
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      await api.updateMe({
        name: name.trim(),
        document: document.trim() || undefined,
        birthDate: brToYMD(birth) ?? undefined,
      });
      hydrate(await api.me());
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView className="bg-cream flex-1" edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScreenHeader title="Meus dados" eyebrow="Conta" />

        {!me && !error ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#0e7a45" />
          </View>
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerClassName="px-6 pb-8 pt-3"
            keyboardShouldPersistTaps="handled"
          >
            <View className="gap-3.5">
              <Field label="Nome">
                <TextInput
                  className={INPUT}
                  value={name}
                  onChangeText={setName}
                  placeholder="Seu nome"
                  placeholderTextColor="#9aa89e"
                />
              </Field>

              <Field label="E-mail">
                <View className="border-edge rounded-[13px] border bg-black/[0.03] px-4 py-[13px]">
                  <Text className="text-muted text-[15px]">{me?.email}</Text>
                </View>
              </Field>

              <Field label="CPF/CNPJ">
                <TextInput
                  className={INPUT}
                  value={document}
                  onChangeText={(t) => setDocument(maskCpfCnpjInput(t))}
                  placeholder="000.000.000-00"
                  placeholderTextColor="#9aa89e"
                  keyboardType="number-pad"
                  inputMode="numeric"
                />
              </Field>
              <Text className="text-sub -mt-2 text-[12px] leading-[17px]">
                Salvo pra agilizar o pagamento - não pedimos de novo no checkout.
              </Text>

              <Field label="Nascimento">
                <TextInput
                  className={INPUT}
                  value={birth}
                  onChangeText={(t) => setBirth(maskDateBR(t))}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor="#9aa89e"
                  keyboardType="number-pad"
                  inputMode="numeric"
                />
              </Field>
            </View>

            {/* Telefone: abre o fluxo de OTP (trocar/confirmar). */}
            <View className="mt-5">
              <Text className="text-ink mb-1.5 text-xs font-semibold">Telefone</Text>
              <Pressable
                onPress={() => router.push('/perfil/telefone' as Href)}
                className="border-edge bg-paper flex-row items-center justify-between rounded-[13px] border px-4 py-[13px] active:opacity-70"
              >
                <Text className={`text-[15px] ${me?.phone ? 'text-ink' : 'text-muted'}`}>
                  {me?.phone ? formatPhoneBR(me.phone) : 'Nenhum confirmado'}
                </Text>
                <Text className="text-coral text-[13px] font-semibold">
                  {me?.phone ? 'Trocar' : 'Confirmar'}
                </Text>
              </Pressable>
            </View>

            {error ? <Text className="text-destructive mt-4 text-sm">{error}</Text> : null}
            {saved ? <Text className="text-green-deep mt-4 text-sm">Dados salvos.</Text> : null}

            <PressScale
              disabled={!canSave}
              onPress={handleSave}
              className={`mt-6 items-center rounded-2xl py-4 ${canSave ? 'bg-coral' : 'bg-coral/50'}`}
            >
              {saving ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-base font-bold text-white">Salvar</Text>
              )}
            </PressScale>

            {/* Link discreto de exclusão de conta (abre o fluxo de retenção). */}
            <Pressable
              onPress={() => router.push('/perfil/excluir' as Href)}
              hitSlop={8}
              className="mt-8 items-center py-2 active:opacity-60"
            >
              <Text className="text-sub text-[13px] underline">Excluir minha conta</Text>
            </Pressable>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
