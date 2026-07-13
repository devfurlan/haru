import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/text';

// Ticket de crédito da assinatura (o Clube). Linguagem visual PRÓPRIA, de propósito distinta
// do carimbo de fidelidade (bolinhas verdes que ENCHEM): aqui é um canhoto serrilhado que se
// GASTA - disponível = ticket cheio (verde-escuro), usado = ticket fantasma (tracejado). A
// serrilha horizontal + os recortes laterais dizem "vale destacável", não "selo que junta".
export function CreditTicket({
  available,
  label,
  notchColor = '#fffdf8',
}: {
  available: boolean;
  label?: string;
  /** Cor do recorte lateral = cor do card onde o ticket está (pra "furar" a borda). */
  notchColor?: string;
}) {
  const ic = available ? '#2fd37a' : '#c3b79c';
  const perf = available ? 'rgba(143,191,164,0.5)' : '#ded2b8';
  const txt = label ?? (available ? 'CRÉDITO' : 'usado');
  return (
    <View
      className="relative h-[92px] flex-1 items-center justify-end overflow-hidden rounded-[13px] px-1.5 pb-3"
      style={
        available
          ? { backgroundColor: '#0a3324', borderWidth: 1.5, borderColor: '#0a3324' }
          : { backgroundColor: '#faf5ea', borderWidth: 1.5, borderColor: '#d9cfb9', borderStyle: 'dashed' }
      }
    >
      {/* serrilha (linha destacável) */}
      <View
        style={{
          position: 'absolute',
          left: 7,
          right: 7,
          top: 28,
          borderTopWidth: 1.4,
          borderColor: perf,
          borderStyle: 'dashed',
        }}
      />
      {/* recortes laterais - furam a borda com a cor do card */}
      <View
        style={{ position: 'absolute', left: -6, top: 22, width: 12, height: 12, borderRadius: 6, backgroundColor: notchColor }}
      />
      <View
        style={{ position: 'absolute', right: -6, top: 22, width: 12, height: 12, borderRadius: 6, backgroundColor: notchColor }}
      />
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={ic} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        {/* ticket/canhoto - o ícone do Clube em todo o fluxo (nada a ver com o presente da fidelidade) */}
        <Path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
        <Path d="M13 5v14" />
      </Svg>
      <Text style={{ color: available ? '#8fbfa4' : '#b3a789', letterSpacing: 0.6 }} className="mt-1.5 text-[9px] font-bold">
        {txt}
      </Text>
    </View>
  );
}

// Fileira de tickets (grid do card de créditos). `balance` cheios, o resto fantasmas.
// ponytail: teto de 6 colunas pra não espremer (plano comum é 4-8/mês); acima disso o
// número grande "N de M" no card é a verdade - os tickets viram amostra dos 6 primeiros.
export function CreditTicketRow({
  balance,
  total,
  notchColor,
}: {
  balance: number;
  total: number;
  notchColor?: string;
}) {
  const cells = Math.max(1, Math.min(total, 6));
  return (
    <View className="mt-4 flex-row gap-2">
      {Array.from({ length: cells }, (_, i) => (
        <CreditTicket key={i} available={i < balance} notchColor={notchColor} />
      ))}
    </View>
  );
}
