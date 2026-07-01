import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api, ApiError } from '@/lib/api';

const fraunces = { fontFamily: 'Fraunces_700Bold' };

type Msg = { role: 'USER' | 'ASSISTANT'; body: string };

const GREETING: Msg = {
  role: 'ASSISTANT',
  body: 'Oi! Sou o suporte do Demandaê. Posso ajudar com o app e com os estabelecimentos onde você agenda. Dúvidas, críticas ou sugestões?',
};

export default function SupportScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    api
      .getSupport()
      .then((r) => setMessages(r.history.map((t) => ({ role: t.role, body: t.body }))))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, []);

  useEffect(scrollToEnd, [messages, sending, scrollToEnd]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setMessages((m) => [...m, { role: 'USER', body: text }]);
    setSending(true);
    try {
      const { reply } = await api.sendSupport(text);
      setMessages((m) => [...m, { role: 'ASSISTANT', body: reply }]);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Algo falhou. Tente de novo.';
      setMessages((m) => [...m, { role: 'ASSISTANT', body: msg }]);
    } finally {
      setSending(false);
    }
  }

  const shown = messages.length ? messages : [GREETING];
  const canSend = !!input.trim() && !sending;

  return (
    <SafeAreaView className="bg-cream flex-1" edges={['top']}>
      <View className="flex-row items-center justify-between px-6 pb-3 pt-3">
        <View>
          <Text className="text-muted text-sm">Suporte</Text>
          <Text style={fraunces} className="text-ink text-3xl">
            Ajuda
          </Text>
        </View>
        <Pressable onPress={() => router.back()} hitSlop={10} className="pb-1">
          <Text className="text-muted text-sm font-medium">Fechar</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#0e7a45" />
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            className="flex-1"
            contentContainerClassName="gap-3 px-4 py-3"
            onContentSizeChange={scrollToEnd}
            keyboardShouldPersistTaps="handled"
          >
            {shown.map((m, i) => (
              <View key={i} className={m.role === 'USER' ? 'items-end' : 'items-start'}>
                <View
                  className={
                    m.role === 'USER'
                      ? 'bg-green max-w-[82%] rounded-2xl px-4 py-2.5'
                      : 'max-w-[82%] rounded-2xl bg-paper px-4 py-2.5'
                  }
                >
                  <Text
                    className={
                      m.role === 'USER'
                        ? 'text-base leading-6 text-white'
                        : 'text-ink text-base leading-6'
                    }
                  >
                    {m.body}
                  </Text>
                </View>
              </View>
            ))}
            {sending && (
              <View className="items-start">
                <View className="rounded-2xl bg-paper px-4 py-2.5">
                  <ActivityIndicator color="#51635a" />
                </View>
              </View>
            )}
          </ScrollView>
        )}

        <View className="bg-cream flex-row items-end gap-2 border-t border-black/5 px-4 py-3">
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Escreva sua mensagem..."
            placeholderTextColor="#9aa5a0"
            multiline
            editable={!sending}
            className="text-ink max-h-28 flex-1 rounded-2xl bg-paper px-4 py-2.5 text-base"
          />
          <Pressable
            onPress={send}
            disabled={!canSend}
            className={`h-11 w-11 items-center justify-center rounded-full ${canSend ? 'bg-coral' : 'bg-muted/40'}`}
          >
            <Text className="text-lg font-bold text-white">↑</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
