import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PasswordInput } from '@/components/password-input';
import { PressScale } from '@/components/press-scale';
import { ScreenHeader } from '@/components/screen-header';
import { Text } from '@/components/text';
import { supabase } from '@/lib/supabase';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View>
      <Text className="text-ink mb-1.5 text-xs font-semibold">{label}</Text>
      {children}
    </View>
  );
}

// Troca de senha do cliente logado. A sessão já existe, então vai direto no Supabase
// (updateUser) - sem endpoint próprio. Recuperar senha esquecida é outro fluxo (/esqueci-senha).
export default function SenhaScreen() {
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const canSave =
    current.length > 0 && password.length >= 8 && password === confirm && !saving;

  async function handleSave() {
    setError(null);
    if (password.length < 8) return setError('A senha deve ter ao menos 8 caracteres.');
    if (password !== confirm) return setError('As senhas não conferem.');
    setSaving(true);
    try {
      // Supabase não tem "verificar senha"; reautentica com a senha atual antes de trocar.
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email;
      if (!email) {
        setError('Sessão expirada. Entre novamente.');
        return;
      }
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password: current,
      });
      if (signInErr) {
        setError('Senha atual incorreta.');
        return;
      }
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) setError('Não foi possível alterar a senha. Tente novamente.');
      else setDone(true);
    } catch {
      setError('Sem conexão com o servidor. Tente de novo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView className="bg-cream flex-1" edges={['top']}>
      <KeyboardAvoidingView
        behavior="padding"
        className="flex-1"
      >
        <ScreenHeader title="Alterar senha" eyebrow="Conta" />

        <ScrollView
          className="flex-1"
          contentContainerClassName="px-6 pb-8 pt-3"
          keyboardShouldPersistTaps="handled"
        >
          {done ? (
            <View className="mt-2">
              <Text className="text-green-deep text-[15px] leading-6">
                Senha alterada. Use a nova senha no próximo login.
              </Text>
              <PressScale
                onPress={() => router.back()}
                className="bg-coral mt-6 items-center rounded-2xl py-4"
              >
                <Text className="text-base font-bold text-white">Voltar</Text>
              </PressScale>
            </View>
          ) : (
            <>
              <View className="gap-3.5">
                <Field label="Senha atual">
                  <PasswordInput
                    className="px-4 py-[13px] text-[15px]"
                    containerClassName="rounded-[13px]"
                    value={current}
                    onChangeText={setCurrent}
                    placeholder="sua senha atual"
                  />
                </Field>
                <Field label="Nova senha">
                  <PasswordInput
                    className="px-4 py-[13px] text-[15px]"
                    containerClassName="rounded-[13px]"
                    value={password}
                    onChangeText={setPassword}
                    placeholder="mínimo 8 caracteres"
                  />
                </Field>
                <Field label="Confirmar senha">
                  <PasswordInput
                    className="px-4 py-[13px] text-[15px]"
                    containerClassName="rounded-[13px]"
                    value={confirm}
                    onChangeText={setConfirm}
                    placeholder="repita a senha"
                  />
                </Field>
              </View>

              {error ? <Text className="text-destructive mt-4 text-sm">{error}</Text> : null}

              <PressScale
                disabled={!canSave}
                onPress={handleSave}
                className={`mt-6 items-center rounded-2xl py-4 ${canSave ? 'bg-coral' : 'bg-coral/50'}`}
              >
                {saving ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text className="text-base font-bold text-white">Salvar nova senha</Text>
                )}
              </PressScale>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
