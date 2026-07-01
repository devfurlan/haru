import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { maskCpfCnpjInput } from '@haru/shared';

import { api, ApiError } from '@/lib/api';

// Pagamento opcional na tela de sucesso do agendamento. Cartão abre o checkout
// hospedado do gateway no navegador in-app; Pix mostra o copia-e-cola pra copiar.
export function PaymentSection({ slug, appointmentId }: { slug: string; appointmentId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsDoc, setNeedsDoc] = useState(false);
  const [document, setDocument] = useState('');
  const [pixCode, setPixCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function pay(method: 'PIX' | 'CREDIT_CARD') {
    setError(null);
    setLoading(true);
    try {
      const result = await api.pay(slug, appointmentId, method, document || undefined);
      if ('error' in result) {
        setError(result.error);
        setNeedsDoc(Boolean(result.needsDocument));
        return;
      }
      if (method === 'CREDIT_CARD' && result.checkoutUrl) {
        await WebBrowser.openBrowserAsync(result.checkoutUrl);
      } else if (method === 'PIX') {
        setPixCode(result.pixCopyPaste ?? null);
        if (!result.pixCopyPaste) setError('Pix indisponível. Tente o cartão.');
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível gerar o pagamento');
    } finally {
      setLoading(false);
    }
  }

  if (pixCode) {
    return (
      <View className="mt-6 w-full rounded-2xl border border-ink/10 bg-paper p-4">
        <Text className="mb-2 text-sm font-semibold text-ink">Pix copia e cola</Text>
        <Text className="text-xs text-muted" numberOfLines={4} selectable>
          {pixCode}
        </Text>
        <Pressable
          onPress={async () => {
            await Clipboard.setStringAsync(pixCode);
            setCopied(true);
          }}
          className="mt-3 items-center rounded-xl bg-green py-3 active:opacity-80"
        >
          <Text className="text-sm font-semibold text-white">
            {copied ? 'Código copiado!' : 'Copiar código Pix'}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="mt-6 w-full">
      <Text className="mb-3 text-center text-sm text-muted">
        Pagamento (opcional - dá pra pagar no dia)
      </Text>
      {needsDoc && (
        <TextInput
          className="mb-3 rounded-xl border border-ink/10 bg-paper px-4 py-3 text-base text-ink"
          value={document}
          onChangeText={(t) => setDocument(maskCpfCnpjInput(t))}
          placeholder="Seu CPF"
          placeholderTextColor="#9aa8a0"
          keyboardType="number-pad"
        />
      )}
      {error ? <Text className="mb-3 text-center text-sm text-destructive">{error}</Text> : null}
      <View className="flex-row gap-3">
        <Pressable
          disabled={loading}
          onPress={() => pay('PIX')}
          className="flex-1 items-center rounded-xl border border-green/40 py-3 active:opacity-60"
        >
          <Text className="text-sm font-semibold text-green">Pagar com Pix</Text>
        </Pressable>
        <Pressable
          disabled={loading}
          onPress={() => pay('CREDIT_CARD')}
          className="flex-1 items-center rounded-xl border border-green/40 py-3 active:opacity-60"
        >
          <Text className="text-sm font-semibold text-green">Cartão</Text>
        </Pressable>
      </View>
      {loading && <ActivityIndicator className="mt-3" color="#0e7a45" />}
    </View>
  );
}
