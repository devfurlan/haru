import { Tabs } from 'expo-router';

import { BottomTabBar } from '@/components/bottom-tab-bar';

// Footer com as 4 abas do app do cliente. book/[slug] e appointment/[id] vivem fora
// deste grupo (sob (app)), então empilham em tela cheia por cima do footer.
// tabBar custom = BottomNav do design + micro-interação (pílula desliza, ícone escala).
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <BottomTabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: 'Início' }} />
      <Tabs.Screen name="buscar" options={{ title: 'Buscar' }} />
      <Tabs.Screen name="agendamentos" options={{ title: 'Agenda' }} />
      <Tabs.Screen name="menu" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}
