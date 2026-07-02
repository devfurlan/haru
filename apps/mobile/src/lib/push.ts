import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import type { NotificationResponse } from 'expo-notifications';
import { Platform } from 'react-native';

import { api } from './api';

// Preferência local do usuário (tela Notificações). Ausente = ligado por padrão; só
// quando explicitamente "false" o registro é pulado. Fonte única de verdade tanto pro
// auto-registro do (app)/_layout quanto pro toggle da tela.
const PUSH_PREF_KEY = 'pushEnabled';

export async function isPushEnabledPref(): Promise<boolean> {
  return (await AsyncStorage.getItem(PUSH_PREF_KEY)) !== 'false';
}

export async function setPushEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(PUSH_PREF_KEY, enabled ? 'true' : 'false');
  if (enabled) await registerForPush();
  else await unregisterPush();
}

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
  // Expo Go (SDK 53+) não faz push remoto e o próprio expo-notifications reclama alto
  // no import. Detecta e pula limpo - push só ativa em dev/standalone build.
  if (Constants.appOwnership === 'expo') return;
  // Usuário desligou push nas Notificações: não registra (nem re-registra no boot).
  if (!(await isPushEnabledPref())) return;

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

// Abre a tela do agendamento quando o usuário toca na notificação. Cobre app
// já rodando (listener) e cold start / app aberto pela notificação (getLast...).
// Import dinâmico pelo mesmo motivo do resto do módulo (não quebrar no Expo Go).
// Retorna um cleanup pra remover o listener.
export async function attachNotificationTap(
  navigate: (appointmentId: string) => void,
): Promise<() => void> {
  if (Constants.appOwnership === 'expo') return () => {};

  try {
    const Notifications = await import('expo-notifications');

    const handle = (response: NotificationResponse) => {
      const id = response.notification.request.content.data?.appointmentId;
      if (typeof id === 'string') navigate(id);
    };

    // Cold start: app foi aberto por um toque na notificação.
    const last = await Notifications.getLastNotificationResponseAsync();
    if (last) handle(last);

    // App já rodando (foreground/background).
    const sub = Notifications.addNotificationResponseReceivedListener(handle);
    return () => sub.remove();
  } catch (err) {
    console.warn('[push] handler de toque falhou:', err);
    return () => {};
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
