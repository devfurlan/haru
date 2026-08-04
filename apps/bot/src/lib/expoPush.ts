// Envio de push via Expo Push API (https://exp.host/--/api/v2/push/send). Sem SDK:
// o endpoint aceita um array de mensagens (até 100 por request). Best-effort - falha
// de rede é logada, não derruba o loop. Retorna os tokens que a Expo reportou como
// inválidos (DeviceNotRegistered) pro caller limpar do banco.

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 100;

export type ExpoPushMessage = {
  to: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
};

type ExpoTicket = { status: string; details?: { error?: string } };

export async function sendExpoPush(
  messages: ExpoPushMessage[],
): Promise<{ invalidTokens: string[] }> {
  const invalidTokens: string[] = [];
  if (messages.length === 0) return { invalidTokens };

  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    // channelId casa com o canal 'default' (importance HIGH) que o app cria no registro.
    // Sem ele o Android joga a notificação no canal genérico do expo-notifications, que
    // é silencioso - a notificação chega mas não aparece na tela.
    const batch = messages.slice(i, i + BATCH_SIZE).map((m) => ({ channelId: 'default', ...m }));
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(batch),
      });
      const json = (await res.json().catch(() => null)) as { data?: ExpoTicket[] } | null;
      const tickets = json?.data ?? [];
      tickets.forEach((ticket, idx) => {
        if (ticket.status !== 'error') return;
        // Token morto (app desinstalado / permissão revogada): sinaliza pra limpar.
        if (ticket.details?.error === 'DeviceNotRegistered') {
          invalidTokens.push(batch[idx].to);
          return;
        }
        // Qualquer outro erro do ticket era descartado calado - inclusive credencial FCM
        // errada/ausente no EAS, que reprova TODO push do app sem deixar rastro.
        console.error('[expoPush] ticket recusado', ticket.details?.error ?? ticket.status, ticket);
      });
    } catch (err) {
      console.error('[expoPush] envio falhou', err);
    }
  }

  return { invalidTokens };
}
