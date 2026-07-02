import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { Text } from '@/components/text';

// Sheet de cancelamento (design 13a "Cancelar · confirmação + motivo"). Substitui
// o Alert nativo por um bottom-sheet fiel ao mockup. Fecha por overlay/back: é uma
// confirmação (voltar atrás = manter o agendamento), não um form com dados a perder.
const fraunces = { fontFamily: 'Fraunces_500Medium' };

// ponytail: motivo é só UX local; a API de cancelamento não tem campo de motivo,
// então a escolha não é enviada. Wire no backend quando/se virar requisito.
const REASONS = [
  'Tive um imprevisto',
  'Encontrei outro horário',
  'Não vou mais precisar',
  'Outro motivo',
];

type Props = {
  visible: boolean;
  whenLabel: string;
  tenantName: string;
  submitting: boolean;
  onConfirm: () => void;
  onReschedule: () => void;
  onClose: () => void;
};

export function CancelSheet({
  visible,
  whenLabel,
  tenantName,
  submitting,
  onConfirm,
  onReschedule,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-[rgba(4,18,12,0.5)]">
        <Pressable className="flex-1" onPress={onClose} />
        <View
          className="bg-cream rounded-t-[28px] px-6 pt-2.5"
          style={{ paddingBottom: insets.bottom + 24 }}
        >
          <View className="mx-auto mb-[18px] mt-1.5 h-[5px] w-11 rounded-full bg-[#dcd2bc]" />

          {/* selo de alerta */}
          <View className="mx-auto h-[58px] w-[58px] items-center justify-center rounded-[18px] bg-[#ffeee9]">
            <Svg width={30} height={30} viewBox="0 0 24 24" fill="none">
              <Path
                d="M12 8v5M12 16.5h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
                stroke="#FF5A36"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>

          <Text style={fraunces} className="text-ink mt-[15px] text-center text-[25px] tracking-tight">
            Cancelar mesmo?
          </Text>
          <Text className="text-muted mt-2 text-center text-[14px] leading-[21px]">
            Seu horário de <Text className="text-ink font-semibold capitalize">{whenLabel}</Text> na{' '}
            <Text className="text-ink font-semibold">{tenantName}</Text> será liberado. Dá pra
            remarcar em vez de cancelar.
          </Text>

          {/* motivo (opcional) */}
          <Pressable
            onPress={() => setReasonOpen((v) => !v)}
            className="border-edge bg-paper mt-4 flex-row items-center gap-2.5 rounded-[14px] border px-3.5 py-3"
          >
            <Text className={`flex-1 text-[13.5px] ${reason ? 'text-ink' : 'text-sub'}`}>
              {reason ?? 'Motivo (opcional)'}
            </Text>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path
                d={reasonOpen ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'}
                stroke="#9aa89e"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </Pressable>
          {reasonOpen ? (
            <View className="border-edge bg-paper mt-1.5 overflow-hidden rounded-[14px] border">
              {REASONS.map((r, i) => (
                <Pressable
                  key={r}
                  onPress={() => {
                    setReason(r === reason ? null : r);
                    setReasonOpen(false);
                  }}
                  className={`flex-row items-center justify-between px-3.5 py-3 active:bg-[#f4ede0] ${i > 0 ? 'border-line border-t' : ''}`}
                >
                  <Text className={`text-[13.5px] ${r === reason ? 'text-ink font-semibold' : 'text-muted'}`}>
                    {r}
                  </Text>
                  {r === reason ? (
                    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M5 12l5 5L19 7"
                        stroke="#0a3324"
                        strokeWidth={2.6}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </Svg>
                  ) : null}
                </Pressable>
              ))}
            </View>
          ) : null}

          {/* política de cancelamento */}
          <View className="mt-[11px] flex-row items-start gap-2">
            <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" style={{ marginTop: 1 }}>
              <Circle cx={12} cy={12} r={9} stroke="#b7ad93" strokeWidth={2} />
              <Path d="M12 8v5M12 16h.01" stroke="#b7ad93" strokeWidth={2} strokeLinecap="round" />
            </Svg>
            <Text className="flex-1 text-[11.5px] leading-[17px] text-[#8b998f]">
              Cancelamento grátis até 2h antes. Depois disso, pode haver cobrança do estabelecimento.
            </Text>
          </View>

          <Pressable
            onPress={onConfirm}
            disabled={submitting}
            className="bg-coral mt-4 items-center rounded-[15px] py-4 active:scale-[0.98] active:opacity-90"
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text className="text-[15px] font-bold text-white">Sim, cancelar</Text>
            )}
          </Pressable>
          <Pressable
            onPress={onReschedule}
            disabled={submitting}
            className="border-green-deep bg-cream mt-[9px] items-center rounded-[15px] border py-[15px] active:scale-[0.98] active:opacity-70"
          >
            <Text className="text-green-deep text-[15px] font-bold">Prefiro remarcar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
