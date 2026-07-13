import { ActivityIndicator, Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Text } from '@/components/text';

// Sheet de confirmação pra entrar na fila (a partir do passo de horário). Fecha por
// overlay/back: é confirmação sem campos a perder (voltar atrás = "agora não"), igual ao
// CancelSheet. Nunca promete o horário - só que a gente avisa (regra de tom).
const fraunces = { fontFamily: 'Fraunces_500Medium' };
const frauncesItalic = { fontFamily: 'Fraunces_500Medium_Italic' };
const frauncesSemi = { fontFamily: 'Fraunces_600SemiBold' };

function RowIcon({ kind }: { kind: 'day' | 'pro' | 'service' }) {
  if (kind === 'day') {
    return (
      <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
        <Rect x={3.5} y={4.5} width={17} height={16} rx={3} stroke="#0a3324" strokeWidth={1.9} />
        <Path d="M3.5 9h17M8 3v4M16 3v4" stroke="#0a3324" strokeWidth={1.9} strokeLinecap="round" />
      </Svg>
    );
  }
  if (kind === 'pro') {
    return (
      <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
        <Circle cx={12} cy={8} r={4} stroke="#0a3324" strokeWidth={1.9} />
        <Path d="M4.5 20c0-3.6 3.4-6 7.5-6s7.5 2.4 7.5 6" stroke="#0a3324" strokeWidth={1.9} strokeLinecap="round" />
      </Svg>
    );
  }
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 3v12M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM18 3 8 13M18 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        stroke="#0a3324"
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function DetailRow({
  kind,
  label,
  value,
  last,
}: {
  kind: 'day' | 'pro' | 'service';
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View className={`flex-row items-center gap-3 py-[13px] ${last ? '' : 'border-b border-dotted border-[#e6dcc6]'}`}>
      <RowIcon kind={kind} />
      <Text className="text-sub flex-1 text-[13px] font-medium">{label}</Text>
      <Text style={frauncesSemi} className="text-ink text-[14.5px]">
        {value}
      </Text>
    </View>
  );
}

type Props = {
  visible: boolean;
  dayLabel: string;
  professionalName: string | null;
  serviceName: string;
  priceLabel: string;
  submitting: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function WaitlistJoinSheet({
  visible,
  dayLabel,
  professionalName,
  serviceName,
  priceLabel,
  submitting,
  onConfirm,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const proValue = professionalName ?? 'Qualquer';

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-[rgba(4,18,12,0.5)]">
        <Pressable className="flex-1" onPress={submitting ? undefined : onClose} />
        <View className="bg-cream rounded-t-[28px] px-6 pt-2.5" style={{ paddingBottom: insets.bottom + 24 }}>
          <View className="mx-auto mb-4 mt-1.5 h-[5px] w-11 rounded-full bg-[#dcd2bc]" />

          <Text style={fraunces} className="text-ink text-[24px] leading-[26px] tracking-tight">
            Entrar na <Text style={frauncesItalic} className="text-green-deep">fila</Text> de{' '}
            {dayLabel.split(',')[0].toLowerCase()}
          </Text>
          <Text className="text-sub mt-1.5 text-[13px] leading-[19px]">
            A gente te avisa assim que abrir uma vaga desse dia{professionalName ? ` com ${professionalName}` : ''}.
          </Text>

          <View className="border-line bg-paper mt-4 rounded-2xl border px-[15px]">
            <DetailRow kind="day" label="Dia" value={dayLabel} />
            <DetailRow kind="pro" label="Profissional" value={proValue} />
            <DetailRow kind="service" label="Serviço" value={`${serviceName} · ${priceLabel}`} last />
          </View>

          {/* reforço: entrar na fila não reserva (regra de tom) */}
          <View className="mt-3 flex-row items-start gap-2.5 rounded-[14px] border border-[#cfe6d7] bg-[#eaf6ee] px-3.5 py-3">
            <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" style={{ marginTop: 1 }}>
              <Circle cx={12} cy={12} r={9} stroke="#1b7a4b" strokeWidth={2} />
              <Path d="M12 8v5M12 16h.01" stroke="#1b7a4b" strokeWidth={2} strokeLinecap="round" />
            </Svg>
            <Text className="flex-1 text-[12px] leading-[17px] text-[#1b6a44]">
              Entrar na fila <Text className="font-bold">não reserva</Text> o horário. Se abrir vaga, você
              é avisado - e quem confirmar primeiro leva.
            </Text>
          </View>

          <Pressable
            onPress={onConfirm}
            disabled={submitting}
            className="bg-coral mt-4 items-center rounded-[15px] py-4 active:scale-[0.98] active:opacity-90"
          >
            {submitting ? (
              <View className="flex-row items-center gap-2.5">
                <ActivityIndicator color="#ffffff" size="small" />
                <Text style={frauncesItalic} className="text-[14.5px] text-white">
                  Entrando na fila…
                </Text>
              </View>
            ) : (
              <Text className="text-[15px] font-bold text-white">Entrar na fila</Text>
            )}
          </Pressable>
          <Pressable
            onPress={submitting ? undefined : onClose}
            className="mt-[9px] items-center py-1.5 active:opacity-60"
          >
            <Text className="text-sub text-[13.5px] font-bold">Agora não</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
