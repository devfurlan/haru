import { Platform } from 'react-native';

import { api } from './api';

// Registro de push (Expo Push). Best-effort: se faltar projectId (EAS), permissão, ou
// rodar em emulador/Expo Go, o push fica inativo e o app segue normal.
//
// IMPORTANTE: `expo-notifications`/`expo-device` são importados DINAMICAMENTE aqui
// dentro (não no topo do módulo). No Expo Go (SDK 53+), o import de expo-notifications
// LANÇA erro ("push removido do Expo Go") - e como este módulo está no caminho de
// import de quase toda tela (via lib/auth), isso quebraria o app inteiro. Com o import
// preguiçoso, o Expo Go só topa nisso se o push for realmente acionado (device real).

let cachedToken: string | null = null;

export async function registerForPush(): Promise<void> {
  try {
    const Device = await import('expo-device');
    if (!Device.isDevice) return; // emulador/Expo Go: sem push remoto

    const Notifications = await import('expo-notifications');

    const existing = await Notifications.getPermissionsAsync();
    let granted = existing.granted;
    if (!granted) {
      const asked = await Notifications.requestPermissionsAsync();
      granted = asked.granted;
    }
    if (!granted) return;

    // Canal obrigatório no Android pra a notificação aparecer.
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Lembretes',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync();
    cachedToken = token;
    await api.pushRegister(token, Platform.OS);
  } catch (err) {
    console.warn('[push] registro falhou (push inativo por ora):', err);
  }
}

export async function unregisterPush(): Promise<void> {
  // Só usa o token em cache + a API (não toca em expo-notifications).
  if (!cachedToken) return;
  const token = cachedToken;
  cachedToken = null;
  try {
    await api.pushUnregister(token);
  } catch {
    // best-effort
  }
}
