import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalendarIcon } from '@/components/calendar-icon';
import { HomeIcon } from '@/components/home-icon';
import { SearchIcon } from '@/components/search-icon';
import { Text } from '@/components/text';
import { UserIcon } from '@/components/user-icon';
import { tapLight } from '@/lib/haptics';

const ON = '#0a3324';
const OFF = '#9aa89e';
const PADDING_X = 16;
const ROW_H = 52;

const TABS: Record<
  string,
  { label: string; Icon: (p: { color: string; size: number }) => React.ReactNode }
> = {
  index: { label: 'Início', Icon: HomeIcon },
  buscar: { label: 'Buscar', Icon: SearchIcon },
  agendamentos: { label: 'Agenda', Icon: CalendarIcon },
  menu: { label: 'Perfil', Icon: UserIcon },
};

// Props do tabBar do expo-router/react-navigation (tipadas localmente: os tipos de
// @react-navigation/bottom-tabs não resolvem sob pnpm).
type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  // Assinaturas frouxas: os genéricos reais do react-navigation não batem 1:1.
  navigation: { emit: (...args: any[]) => any; navigate: (...args: any[]) => void };
};

// Barra de abas do design (BottomNav) com a micro-interação C: uma "pílula" verde-clara
// desliza pra aba ativa (380ms) e o ícone dá um leve overshoot de escala.
export function BottomTabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(0);
  const [anim] = useState(() => new Animated.Value(state.index));

  useEffect(() => {
    Animated.timing(anim, {
      toValue: state.index,
      duration: 380,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start();
  }, [state.index, anim]);

  const tabW = width > 0 ? (width - PADDING_X * 2) / state.routes.length : 0;
  const pillX = Animated.add(PADDING_X, Animated.multiply(anim, tabW));

  return (
    <View
      style={{
        backgroundColor: '#fffdf8',
        borderTopWidth: 1,
        borderTopColor: '#f0e8d4',
        paddingTop: 10,
        paddingHorizontal: PADDING_X,
        paddingBottom: insets.bottom + 8,
      }}
    >
      <View style={{ height: ROW_H }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {/* pílula que desliza pra aba ativa */}
        {tabW > 0 ? (
          <Animated.View
            style={{
              position: 'absolute',
              top: 2,
              height: ROW_H - 4,
              width: tabW,
              borderRadius: 16,
              backgroundColor: '#eaf6ee',
              transform: [{ translateX: pillX }],
            }}
          />
        ) : null}

        <View className="flex-1 flex-row">
          {state.routes.map((route, i) => {
            const tab = TABS[route.name];
            if (!tab) return null;
            const focused = state.index === i;
            const scale = anim.interpolate({
              inputRange: [i - 1, i, i + 1],
              outputRange: [1, 1.12, 1],
              extrapolate: 'clamp',
            });

            const onPress = () => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) {
                tapLight();
                navigation.navigate(route.name);
              }
            };

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                accessibilityRole="button"
                accessibilityState={focused ? { selected: true } : {}}
                className="flex-1 items-center justify-center gap-[5px]"
              >
                <Animated.View style={{ transform: [{ scale }] }}>
                  <tab.Icon color={focused ? ON : OFF} size={24} />
                </Animated.View>
                <Text
                  className="text-[10.5px]"
                  style={{ color: focused ? ON : OFF, fontWeight: focused ? '700' : '600' }}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}
