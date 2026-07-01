import { Link, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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

import { formatBRL, formatDuration, maskPhoneBRInput } from '@haru/shared';

import { PaymentSection } from '@/components/payment-section';
import { SlotPicker } from '@/components/slot-picker';
import { api, ApiError, type PublicService, type PublicTenant } from '@/lib/api';
import { useAuth } from '@/lib/auth';

type Step = 'service' | 'slot' | 'contact' | 'done';

export default function BookScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { session } = useAuth();

  const [tenant, setTenant] = useState<PublicTenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [step, setStep] = useState<Step>('service');
  const [service, setService] = useState<PublicService | null>(null);
  const [slotIso, setSlotIso] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [booked, setBooked] = useState<{ appointmentId: string; paymentAvailable: boolean } | null>(
    null,
  );

  useEffect(() => {
    let active = true;
    api
      .tenant(slug)
      .then((t) => active && setTenant(t))
      .catch(
        (err) => active && setLoadError(err instanceof ApiError ? err.message : 'Erro ao carregar'),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [slug]);

  // Pré-preenche contato se o cliente estiver logado (melhor esforço).
  useEffect(() => {
    if (!session) return;
    let active = true;
    api
      .me()
      .then((me) => {
        if (!active) return;
        if (me.name) setName(me.name);
        if (me.phone) setPhone(maskPhoneBRInput(me.phone));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [session]);

  const loadSlots = useCallback(
    (dateStr: string) =>
      service
        ? api.tenantSlots(slug, service.id, dateStr).then((r) => r.slots)
        : Promise.resolve([]),
    [slug, service],
  );

  async function handleConfirm() {
    if (!service || !slotIso) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await api.createBooking(slug, {
        serviceId: service.id,
        slotIso,
        name: name.trim(),
        phone,
      });
      setSummary(result.summary);
      setBooked({ appointmentId: result.appointmentId, paymentAvailable: result.paymentAvailable });
      setStep('done');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível agendar');
    } finally {
      setSubmitting(false);
    }
  }

  function goBack() {
    if (step === 'slot') setStep('service');
    else if (step === 'contact') setStep('slot');
    else router.back();
  }

  if (loading) {
    return (
      <SafeAreaView className="bg-cream flex-1 items-center justify-center">
        <ActivityIndicator color="#0e7a45" />
      </SafeAreaView>
    );
  }

  if (loadError || !tenant) {
    return (
      <SafeAreaView className="bg-cream flex-1 px-6 pt-10">
        <Text className="text-destructive text-base">{loadError ?? 'Negócio não encontrado'}</Text>
      </SafeAreaView>
    );
  }

  const canConfirm =
    name.trim().length >= 2 && phone.replace(/\D/g, '').length >= 10 && !submitting;

  return (
    <SafeAreaView className="bg-cream flex-1" edges={['top']}>
      {step !== 'done' && (
        <View className="flex-row items-center px-4 pb-2 pt-2">
          <Pressable onPress={goBack} hitSlop={8} className="py-1 pr-3">
            <Text className="text-coral text-base">‹ Voltar</Text>
          </Pressable>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView className="flex-1 px-6" contentContainerClassName="pb-10">
          <Text className="text-ink text-2xl font-bold">{tenant.name}</Text>

          {!tenant.publicBookingEnabled ? (
            <Text className="text-muted mt-6 text-base">
              Este negócio não está aceitando agendamentos online no momento.
            </Text>
          ) : step === 'service' ? (
            <>
              <Text className="text-muted mb-3 mt-1 text-base">Escolha o serviço</Text>
              {tenant.services.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => {
                    setService(s);
                    setStep('slot');
                  }}
                  className="border-ink/10 bg-paper mb-3 rounded-2xl border p-4 active:opacity-70"
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="text-ink text-base font-semibold">{s.name}</Text>
                    <Text className="text-coral text-sm font-semibold">
                      {formatBRL(s.priceCents)}
                    </Text>
                  </View>
                  {s.description ? (
                    <Text className="text-muted mt-1 text-sm">{s.description}</Text>
                  ) : null}
                  <Text className="text-ink-soft mt-2 text-sm">
                    {formatDuration(s.durationMinutes)}
                  </Text>
                </Pressable>
              ))}
              {tenant.services.length === 0 && (
                <Text className="text-muted mt-4 text-sm">Nenhum serviço disponível.</Text>
              )}
            </>
          ) : step === 'slot' && service ? (
            <>
              <Text className="text-muted mb-3 mt-1 text-base">
                {service.name} · escolha o horário
              </Text>
              <SlotPicker
                timezone={tenant.timezone}
                openWeekdays={tenant.openWeekdays}
                loadSlots={loadSlots}
                onConfirm={(iso) => {
                  setSlotIso(iso);
                  setStep('contact');
                }}
                submitting={false}
              />
            </>
          ) : step === 'contact' ? (
            <View className="mt-2">
              <Text className="text-muted mb-4 text-base">Seus dados</Text>
              <Text className="text-ink-soft mb-1 text-sm font-medium">Nome</Text>
              <TextInput
                className="border-ink/10 bg-paper text-ink mb-4 rounded-xl border px-4 py-3 text-base"
                value={name}
                onChangeText={setName}
                placeholder="Seu nome"
                placeholderTextColor="#9aa8a0"
              />
              <Text className="text-ink-soft mb-1 text-sm font-medium">WhatsApp</Text>
              <TextInput
                className="border-ink/10 bg-paper text-ink mb-6 rounded-xl border px-4 py-3 text-base"
                value={phone}
                onChangeText={(t) => setPhone(maskPhoneBRInput(t))}
                placeholder="(11) 91234-5678"
                placeholderTextColor="#9aa8a0"
                keyboardType="phone-pad"
                inputMode="tel"
              />
              {error ? <Text className="text-destructive mb-4 text-sm">{error}</Text> : null}
              <Pressable
                disabled={!canConfirm}
                onPress={handleConfirm}
                className={`items-center rounded-xl py-4 ${canConfirm ? 'bg-coral' : 'bg-coral/50'}`}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text className="text-base font-semibold text-white">Confirmar agendamento</Text>
                )}
              </Pressable>
            </View>
          ) : (
            <View className="mt-6 items-center">
              <Text className="text-2xl">🎉</Text>
              <Text className="text-ink mt-2 text-center text-xl font-bold">
                Agendamento confirmado!
              </Text>
              {summary ? (
                <Text className="text-ink-soft mt-2 text-center text-base capitalize">
                  {summary}
                </Text>
              ) : null}
              {booked?.paymentAvailable ? (
                <PaymentSection slug={slug} appointmentId={booked.appointmentId} />
              ) : null}
              <Link href={session ? '/' : '/login'} asChild>
                <Pressable className="bg-coral mt-8 items-center rounded-xl px-6 py-4">
                  <Text className="text-base font-semibold text-white">
                    {session ? 'Ver meus agendamentos' : 'Entrar na minha conta'}
                  </Text>
                </Pressable>
              </Link>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
