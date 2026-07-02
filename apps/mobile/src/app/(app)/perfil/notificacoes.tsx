import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { Text } from '@/components/text';
import { api, ApiError } from '@/lib/api';
import { isPushEnabledPref, setPushEnabled } from '@/lib/push';

// Toggle no estilo do design: trilho verde quando ligado, botão branco desliza.
function Toggle({
  value,
  onValueChange,
  disabled,
}: {
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={() => !disabled && onValueChange(!value)}
      hitSlop={6}
      className={`h-[26px] w-[44px] justify-center rounded-full px-0.5 ${
        value ? 'bg-green-bright' : 'bg-black/15'
      } ${disabled ? 'opacity-40' : ''}`}
    >
      <View className={`h-[21px] w-[21px] rounded-full bg-white ${value ? 'self-end' : 'self-start'}`} />
    </Pressable>
  );
}

function ToggleRow({
  title,
  description,
  value,
  onValueChange,
  disabled,
  last,
}: {
  title: string;
  description: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
  last?: boolean;
}) {
  return (
    <View
      className={`flex-row items-center gap-3 py-[15px] ${last ? '' : 'border-b border-[#ece3cf]'}`}
    >
      <View className="flex-1">
        <Text className="text-ink text-[15px] font-semibold">{title}</Text>
        <Text className="text-sub mt-1 text-[12.5px] leading-[18px]">{description}</Text>
      </View>
      <Toggle value={value} onValueChange={onValueChange} disabled={disabled} />
    </View>
  );
}

export default function NotificacoesScreen() {
  const [emails, setEmails] = useState<boolean | null>(null);
  const [push, setPush] = useState<boolean | null>(null);
  const [savingEmails, setSavingEmails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .me()
      .then((m) => setEmails(m.appointmentEmailsEnabled))
      .catch(() => setError('Não foi possível carregar as preferências.'));
    isPushEnabledPref().then(setPush);
  }, []);

  async function toggleEmails(next: boolean) {
    setError(null);
    setEmails(next); // otimista
    setSavingEmails(true);
    try {
      await api.updateMe({ appointmentEmailsEnabled: next });
    } catch (err) {
      setEmails(!next); // reverte
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar.');
    } finally {
      setSavingEmails(false);
    }
  }

  async function togglePush(next: boolean) {
    setPush(next);
    try {
      await setPushEnabled(next); // grava a preferência + registra/cancela (best-effort)
    } catch {
      // push é best-effort; a preferência local já foi gravada
    }
  }

  const loading = emails === null || push === null;

  return (
    <SafeAreaView className="bg-cream flex-1" edges={['top']}>
      <ScreenHeader title="Notificações" eyebrow="Conta" />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0e7a45" />
        </View>
      ) : (
        <View className="px-6 pt-3">
          <ToggleRow
            title="Notificações push"
            description="Lembretes e avisos dos seus agendamentos neste aparelho. Depende também da permissão do sistema."
            value={push!}
            onValueChange={togglePush}
          />
          <ToggleRow
            title="E-mails de agendamento"
            description="Confirmação, lembrete, remarcação e cancelamento no seu e-mail de login."
            value={emails!}
            onValueChange={toggleEmails}
            disabled={savingEmails}
            last
          />

          {error ? <Text className="text-destructive mt-4 text-sm">{error}</Text> : null}
        </View>
      )}
    </SafeAreaView>
  );
}
