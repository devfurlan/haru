import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PressScale } from '@/components/press-scale';
import { ScreenHeader } from '@/components/screen-header';
import { Text } from '@/components/text';
import { api, ApiError } from '@/lib/api';
import { signOut } from '@/lib/auth';

// Fluxo de exclusão de conta em dois gates de retenção: a ação principal (prominente)
// segura o cliente ("Manter minha conta"); o botão de excluir é discreto e só revela a
// confirmação definitiva após um primeiro toque. Chega aqui a partir de "Meus dados".
function LossRow({ children }: { children: string }) {
  return (
    <View className="flex-row gap-2.5">
      <Text className="text-destructive text-[15px] leading-[22px]">•</Text>
      <Text className="text-sub flex-1 text-[14px] leading-[22px]">{children}</Text>
    </View>
  );
}

export default function ExcluirContaScreen() {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function doDelete() {
    setError(null);
    setDeleting(true);
    try {
      await api.deleteAccount();
      await signOut(); // limpa a sessão local -> volta pro login
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível excluir a conta.');
      setDeleting(false);
    }
  }

  return (
    <SafeAreaView className="bg-cream flex-1" edges={['top']}>
      <ScreenHeader title="Excluir conta" eyebrow="Conta" />
      <ScrollView className="flex-1" contentContainerClassName="px-6 pb-10 pt-3">
        <Text className="text-ink text-[15px] leading-[23px]">
          Que pena que você quer ir. Antes de excluir, veja o que acontece - essa ação não tem
          volta:
        </Text>

        <View className="border-edge bg-paper mt-5 gap-3 rounded-2xl border p-5">
          <LossRow>Você perde o acesso a esta conta - não dá pra recuperar depois.</LossRow>
          <LossRow>Seus favoritos e preferências de notificação são apagados.</LossRow>
          <LossRow>
            Seus agendamentos continuam registrados nos estabelecimentos onde você marcou.
          </LossRow>
        </View>

        <Text className="text-sub mt-5 text-[14px] leading-[21px]">
          Só precisa de uma pausa? Dá pra sair da conta e voltar quando quiser, sem perder nada. Se
          o incômodo são os avisos, você pode desligá-los em Notificações.
        </Text>

        {error ? <Text className="text-destructive mt-5 text-sm">{error}</Text> : null}

        {/* Ação principal: reter o cliente. */}
        <PressScale
          onPress={() => router.back()}
          disabled={deleting}
          className="bg-green-deep mt-8 items-center rounded-2xl py-4"
        >
          <Text className="text-base font-bold text-white">Manter minha conta</Text>
        </PressScale>

        {/* Segundo gate: o botão de exclusão definitiva só aparece após confirmar a intenção. */}
        {confirming ? (
          <View className="mt-6">
            <Text className="text-ink text-center text-[14px] font-semibold">
              Tem certeza? Isso é permanente.
            </Text>
            <PressScale
              onPress={doDelete}
              disabled={deleting}
              className="border-destructive mt-3 items-center rounded-2xl border py-4"
            >
              {deleting ? (
                <ActivityIndicator color="#e5484d" />
              ) : (
                <Text className="text-destructive text-base font-bold">
                  Sim, excluir definitivamente
                </Text>
              )}
            </PressScale>
          </View>
        ) : (
          <PressScale
            onPress={() => setConfirming(true)}
            className="mt-6 items-center py-3 active:opacity-60"
          >
            <Text className="text-sub text-sm font-semibold underline">Excluir mesmo assim</Text>
          </PressScale>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
