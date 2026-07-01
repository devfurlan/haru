import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { api } from './api';

// Registro de push (Expo Push). Best-effort: se faltar projectId (EAS), permissão, ou
// rodar em emulador/Expo Go, o push fica inativo e o app segue normal - o registro só
// ativa de fato num dev/standalone build com `eas init` feito. ponytail: sem retry/lib.

let cachedToken: string | null = null;

export async function registerForPush(): Promise<void> {
  try {
    if (!Device.isDevice) return; // emulador não recebe push remoto

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
  if (!cachedToken) return;
  const token = cachedToken;
  cachedToken = null;
  try {
    await api.pushUnregister(token);
  } catch {
    // best-effort
  }
}
