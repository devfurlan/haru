import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { PressScale } from '@/components/press-scale';
import { Text } from '@/components/text';

// Card "dia lotado + expediente rolando" que aparece no passo de horário quando o dia
// escolhido não tem nenhuma vaga com aquele profissional (regra 1). O SlotPicker acima
// já mostra os horários ocupados riscados; aqui vem só a chamada pra entrar na fila.
// Copy nunca promete o horário (regra de tom): "pode abrir", "você é avisado".
const fraunces = { fontFamily: 'Fraunces_500Medium' };
const frauncesItalic = { fontFamily: 'Fraunces_500Medium_Italic' };

function BellIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9Z" stroke="#fff" strokeWidth={2} strokeLinejoin="round" />
      <Path d="M13.7 21a2 2 0 0 1-3.4 0" stroke="#fff" strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

type Props = {
  /** "Sáb, 15/07". */
  dayLabel: string;
  /** Nome do profissional; null = "qualquer". */
  professionalName: string | null;
  onPress: () => void;
  submitting?: boolean;
};

export function WaitlistCta({ dayLabel, professionalName, onPress, submitting }: Props) {
  const withPro = professionalName ? ` com ${professionalName}` : '';
  return (
    <View className="mt-[18px]">
      <View className="border-line bg-paper rounded-[20px] border p-[17px] shadow-sm">
        {/* status: ainda dá tempo (o dia ainda está rolando) - ponto verde pulsa via opacidade */}
        <View className="flex-row items-center gap-2">
          <View className="bg-green-bright h-2 w-2 rounded-full" />
          <Text className="text-[10.5px] font-bold uppercase tracking-[1.3px] text-[#1b7a4b]">
            Ainda dá tempo · o dia tá rolando
          </Text>
        </View>

        <Text style={fraunces} className="text-ink mt-2.5 text-[20px] leading-[24px] tracking-tight">
          {dayLabel} tá <Text style={frauncesItalic} className="text-coral">lotado</Text>
          {withPro}
        </Text>
        <Text className="mt-2 text-[13px] leading-[19px] text-[#5c6b60]">
          Todos os horários já foram. Mas o dia ainda tá rolando - se alguém desmarcar, você pode ser
          o primeiro a saber.
        </Text>

        <PressScale
          onPress={onPress}
          disabled={submitting}
          className="bg-coral mt-[15px] flex-row items-center justify-center gap-2.5 rounded-[15px] py-[15px]"
        >
          <BellIcon />
          <Text className="text-[15px] font-bold text-white">Me avisa se abrir</Text>
        </PressScale>
      </View>

      {/* não promete o horário (regra de tom) */}
      <View className="mt-[11px] flex-row items-start gap-[7px]">
        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" style={{ marginTop: 1 }}>
          <Circle cx={12} cy={12} r={9} stroke="#b7ad93" strokeWidth={2} />
          <Path d="M12 8v5M12 16h.01" stroke="#b7ad93" strokeWidth={2} strokeLinecap="round" />
        </Svg>
        <Text className="flex-1 text-[11.5px] leading-[16px] text-[#8b998f]">
          Entrar na fila não garante o horário. A gente avisa; quem confirmar primeiro leva.
        </Text>
      </View>
    </View>
  );
}
