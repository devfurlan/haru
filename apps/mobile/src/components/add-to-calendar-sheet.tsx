import { Linking, Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';

import { Text } from '@/components/text';
import {
  appleIcsUri,
  googleUrl,
  outlookUrl,
  yahooUrl,
  type CalendarEvent,
} from '@/lib/calendar-links';

// Sheet "adicionar à agenda" (design 10b/11b). Fecha por overlay/back: é só um
// seletor (nada digitado a perder), então segue o padrão dos sheets de visualização.
const fraunces = { fontFamily: 'Fraunces_500Medium' };
const frauncesItalic = { fontFamily: 'Fraunces_500Medium_Italic' };

function AppleGlyph() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Rect x={3.5} y={4.5} width={17} height={16} rx={3} stroke="#fff" strokeWidth={2} />
      <Path d="M3.5 9h17M8 3v4M16 3v4" stroke="#fff" strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

const PROVIDERS = [
  { key: 'google', label: 'Google Agenda', bg: '#4285F4', badge: 'G', build: googleUrl },
  { key: 'apple', label: 'Apple Calendário', bg: '#0F1F18', badge: 'apple', build: appleIcsUri },
  { key: 'outlook', label: 'Outlook', bg: '#0A66C2', badge: 'O', build: outlookUrl },
  { key: 'yahoo', label: 'Yahoo Agenda', bg: '#6001D2', badge: 'Y', build: yahooUrl },
] as const;

type Props = { visible: boolean; event: CalendarEvent; onClose: () => void };

export function AddToCalendarSheet({ visible, event, onClose }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-[rgba(4,18,12,0.55)]">
        <Pressable className="flex-1" onPress={onClose} />
        <View
          className="bg-cream rounded-t-[28px] px-[22px] pt-3"
          style={{ paddingBottom: insets.bottom + 24 }}
        >
          <View className="mx-auto mb-4 mt-1.5 h-[5px] w-[42px] rounded-full bg-[#dbcfb6]" />
          <Text style={fraunces} className="text-[22px] text-[#0F1F18]">
            Adicionar à <Text style={frauncesItalic} className="text-green-deep">agenda</Text>
          </Text>
          <Text className="mt-[3px] text-[13px] text-[#7c8a80]">Escolha onde salvar seu horário</Text>

          <View className="mt-4">
            {PROVIDERS.map((p, i) => (
              <Pressable
                key={p.key}
                onPress={async () => {
                  onClose();
                  try {
                    await Linking.openURL(p.build(event));
                  } catch {
                    // provedor sem app/handler - silencioso (ex.: .ics em iOS antigo)
                  }
                }}
                className={`flex-row items-center gap-[13px] py-[13px] active:opacity-60 ${
                  i > 0 ? 'border-t border-[#ece3cf]' : ''
                }`}
              >
                <View
                  className="h-10 w-10 items-center justify-center rounded-xl"
                  style={{ backgroundColor: p.bg }}
                >
                  {p.badge === 'apple' ? (
                    <AppleGlyph />
                  ) : (
                    <Text className="text-[18px] font-bold text-white">{p.badge}</Text>
                  )}
                </View>
                <Text className="flex-1 text-[15px] font-semibold text-[#0F1F18]">{p.label}</Text>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M9 6l6 6-6 6"
                    stroke="#c3b79c"
                    strokeWidth={2.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}
