import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text, TextInput } from '@/components/text';

import { BookingSuccess } from '@/components/booking-success';
import { PressScale } from '@/components/press-scale';
import { TenantAvatar } from '@/components/tenant-avatar';
import { api, ApiError, type AppointmentItem } from '@/lib/api';

const fraunces = { fontFamily: 'Fraunces_600SemiBold' };

// Espelha avaliar-client.tsx do web (mesma copy PT-BR, mesma engine via /reviews).
const LABELS = [
  '',
  'Eita, o que houve?',
  'Podia ser melhor',
  'Foi ok',
  'Gostei bastante',
  'Perfeito, virou ritual!',
];
const CHIPS_BONS = [
  'Atendimento nota dez',
  'Pontualidade',
  'Ambiente agradável',
  'Resultado impecável',
  'Preço justo',
];
const CHIPS_RUINS = ['Atraso no horário', 'Atendimento frio', 'Resultado abaixo', 'Ambiente', 'Preço'];

const STAR_PATH =
  'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z';

function Star({ filled, size = 44 }: { filled: boolean; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={STAR_PATH} fill={filled ? '#ff5a36' : '#d9cdb3'} />
    </Svg>
  );
}

export default function AvaliarScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<AppointmentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [rating, setRating] = useState(0);
  const [chips, setChips] = useState<Record<string, boolean>>({});
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [contactRequested, setContactRequested] = useState(false);
  const [contactPending, setContactPending] = useState(false);

  const chipList = rating >= 4 ? CHIPS_BONS : CHIPS_RUINS;

  useEffect(() => {
    let active = true;
    api
      .appointments()
      .then(async ({ upcoming, past }) => {
        if (!active) return;
        const found = [...upcoming, ...past].find((a) => a.id === id) ?? null;
        setItem(found);
        if (!found) {
          setLoadError('Agendamento não encontrado');
          return;
        }
        // Pré-preenche com a avaliação atual (avaliação é por estabelecimento, editável).
        try {
          const mine = await api.myReview(found.tenant.id);
          if (!active) return;
          if (mine.rating) setRating(mine.rating);
          if (mine.comment) setComment(mine.comment);
        } catch {
          // sem avaliação anterior: segue com o form vazio
        }
      })
      .catch((err) => active && setLoadError(err instanceof ApiError ? err.message : 'Erro ao carregar'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  function pickRating(n: number) {
    setRating(n);
    setChips({}); // conjuntos elogio/ressalva diferem: troca de nota limpa a seleção
  }

  async function submit() {
    if (!item) return;
    if (rating < 1) {
      setError('Escolha de 1 a 5 estrelas.');
      return;
    }
    setError(null);
    setSubmitting(true);
    const tags = chipList.filter((c) => chips[c]);
    const finalComment = [tags.join(' · '), comment.trim()].filter(Boolean).join('\n');
    try {
      await api.submitReview(item.tenant.id, rating, finalComment);
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível enviar');
    } finally {
      setSubmitting(false);
    }
  }

  async function askOwnerContact() {
    if (!item) return;
    setContactPending(true);
    try {
      await api.requestOwnerContact(item.tenant.id);
      setContactRequested(true);
    } catch (err) {
      Alert.alert('Erro', err instanceof ApiError ? err.message : 'Não foi possível');
    } finally {
      setContactPending(false);
    }
  }

  if (sent && item) {
    return (
      <BookingSuccess
        titlePlain="Valeu pela"
        titleAccent="nota!"
        icon="check"
        showCard={false}
        message={`Sua avaliação de ★ ${rating},0 já foi pro ${item.tenant.name}. Isso ajuda outras pessoas a escolher.`}
        tenant={{ name: item.tenant.name, logoUrl: item.tenant.logoUrl }}
      >
        {rating <= 2 ? (
          contactRequested ? (
            <Text className="text-center text-[13.5px] leading-5 text-[#cfe6d8]">
              Pronto. O {item.tenant.name} foi avisado e pode te procurar pra resolver.
            </Text>
          ) : (
            <PressScale
              onPress={askOwnerContact}
              disabled={contactPending}
              className="bg-coral items-center rounded-2xl py-4 active:opacity-90"
            >
              {contactPending ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text className="text-[15px] font-bold text-white">Quero que entrem em contato</Text>
              )}
            </PressScale>
          )
        ) : null}
        {rating >= 4 ? (
          <PressScale
            onPress={() => router.push(`/book/${item.tenant.slug}`)}
            className="bg-coral items-center rounded-2xl py-4 active:opacity-90"
          >
            <Text className="text-[15px] font-bold text-white">Agende sua próxima</Text>
          </PressScale>
        ) : null}
        <PressScale
          onPress={() => router.back()}
          className="items-center rounded-2xl border border-[rgba(250,245,234,0.24)] py-4 active:opacity-70"
        >
          <Text className="text-cream text-[15px] font-bold">Voltar</Text>
        </PressScale>
      </BookingSuccess>
    );
  }

  return (
    <SafeAreaView className="bg-cream flex-1" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center gap-3 px-[22px] pb-1 pt-6">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          className="bg-paper border-edge h-10 w-10 items-center justify-center rounded-[13px] border active:opacity-70"
        >
          <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
            <Path
              d="M15 5l-7 7 7 7"
              stroke="#0a3324"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>
        <View className="flex-1">
          <Text className="text-ink text-[14px] font-semibold">Avaliar atendimento</Text>
          {item ? (
            <Text className="text-sub text-[11.5px] font-medium capitalize" numberOfLines={1}>
              {item.whenLabel}
            </Text>
          ) : null}
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0e7a45" />
        </View>
      ) : !item ? (
        <Text className="text-destructive px-6 pt-6 text-sm">{loadError ?? 'Não encontrado'}</Text>
      ) : (
        <ScrollView className="flex-1" contentContainerClassName="px-[22px] pb-10 pt-2">
          {/* Estabelecimento */}
          <View className="bg-paper border-line mt-3 flex-row items-center gap-3.5 rounded-[18px] border p-[15px]">
            <TenantAvatar name={item.tenant.name} logoUrl={item.tenant.logoUrl} size={48} radius={14} />
            <View className="flex-1">
              <Text style={fraunces} className="text-ink text-[17px]" numberOfLines={1}>
                {item.tenant.name}
              </Text>
              <Text className="text-sub mt-0.5 text-[12.5px] font-medium" numberOfLines={1}>
                {item.serviceName}
                {item.professionalName ? ` · com ${item.professionalName}` : ''}
              </Text>
            </View>
          </View>

          {/* Estrelas */}
          <View className="mt-8 items-center">
            <Text style={fraunces} className="text-ink text-center text-[24px]">
              Como foi dessa vez?
            </Text>
            <View className="mt-5 flex-row gap-2.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => pickRating(n)} hitSlop={4} className="active:opacity-80">
                  <Star filled={rating >= n} />
                </Pressable>
              ))}
            </View>
            <Text style={fraunces} className="text-sub mt-2.5 min-h-[22px] text-[15px] italic">
              {LABELS[rating]}
            </Text>
          </View>

          {/* Chips + comentário (só depois de dar uma nota) */}
          {rating > 0 ? (
            <View className="mt-6">
              <Text className="text-ink text-[14px] font-semibold">
                {rating >= 4 ? 'O que brilhou?' : 'O que pegou?'}
              </Text>
              <View className="mt-3 flex-row flex-wrap gap-2">
                {chipList.map((c) => {
                  const on = !!chips[c];
                  return (
                    <Pressable
                      key={c}
                      onPress={() => setChips((s) => ({ ...s, [c]: !s[c] }))}
                      className={
                        on
                          ? 'bg-green-deep border-green-deep rounded-full border px-4 py-2.5 active:opacity-80'
                          : 'border-edge bg-paper rounded-full border px-4 py-2.5 active:opacity-80'
                      }
                    >
                      <Text className={on ? 'text-cream text-[12.5px] font-bold' : 'text-ink text-[12.5px] font-bold'}>
                        {c}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text className="text-ink mt-6 text-[14px] font-semibold">
                Quer contar mais? <Text className="text-ink-30 font-medium">(opcional)</Text>
              </Text>
              <TextInput
                value={comment}
                onChangeText={setComment}
                maxLength={500}
                multiline
                placeholder="Escreva o que achou do atendimento, do ambiente, do profissional…"
                placeholderTextColor="#9aa8a0"
                className="border-edge bg-paper text-ink mt-2.5 min-h-[92px] rounded-[15px] border px-4 py-3.5 text-sm"
                style={{ textAlignVertical: 'top' }}
              />

              {error ? <Text className="text-destructive mt-2 text-sm">{error}</Text> : null}

              <PressScale
                onPress={submit}
                disabled={submitting}
                className="bg-coral mt-5 items-center rounded-[15px] py-4 active:opacity-90"
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text className="text-[15px] font-bold text-white">Enviar avaliação</Text>
                )}
              </PressScale>
            </View>
          ) : error ? (
            <Text className="text-destructive mt-4 text-center text-sm">{error}</Text>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
