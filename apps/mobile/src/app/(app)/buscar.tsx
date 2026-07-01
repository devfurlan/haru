import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BuscarScreen() {
  const [slug, setSlug] = useState('');
  const clean = slug.trim().replace(/^@/, '').toLowerCase();

  return (
    <SafeAreaView className="bg-cream flex-1" edges={['top']}>
      <View className="flex-row items-center px-4 pb-2 pt-2">
        <Pressable onPress={() => router.back()} hitSlop={8} className="py-1 pr-3">
          <Text className="text-coral text-base">‹ Voltar</Text>
        </Pressable>
      </View>
      <View className="px-6 pt-4">
        <Text style={{ fontFamily: 'Fraunces_700Bold' }} className="text-ink text-3xl">
          Agendar em um negócio
        </Text>
        <Text className="text-muted mb-6 mt-1 text-base">
          Digite o @ do negócio (ex.: salao-da-joana).
        </Text>
        <View className="border-ink/10 bg-paper flex-row items-center rounded-xl border px-4">
          <Text className="text-muted text-base">@</Text>
          <TextInput
            className="text-ink flex-1 py-3 pl-1 text-base"
            value={slug}
            onChangeText={setSlug}
            placeholder="nome-do-negocio"
            placeholderTextColor="#9aa8a0"
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={() =>
              clean.length >= 1 &&
              router.push({ pathname: '/book/[slug]', params: { slug: clean } })
            }
          />
        </View>
        <Pressable
          disabled={clean.length < 1}
          onPress={() => router.push({ pathname: '/book/[slug]', params: { slug: clean } })}
          className={`mt-6 items-center rounded-xl py-4 ${clean.length >= 1 ? 'bg-coral' : 'bg-coral/50'}`}
        >
          <Text className="text-base font-semibold text-white">Continuar</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
