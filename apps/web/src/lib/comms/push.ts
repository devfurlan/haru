import 'server-only';

import { prisma } from '@haru/database';

import { sendExpoPush } from '@/lib/expo-push';

/**
 * Envia push (Expo) e limpa do banco os tokens que a Expo reportar como mortos
 * (DeviceNotRegistered). Wrapper "envia + limpa" compartilhado pela fila de espera e pela
 * assinatura de serviços - antes era privado em waitlist.ts. Fail-soft (o sendExpoPush já
 * engole erro de rede); no-op se `tokens` vier vazio.
 */
export async function sendPushSafe(
  tokens: string[],
  msg: { title: string; body: string; data?: Record<string, unknown> },
): Promise<void> {
  if (tokens.length === 0) return;
  const { invalidTokens } = await sendExpoPush(tokens.map((to) => ({ to, ...msg })));
  if (invalidTokens.length > 0) {
    await prisma.pushDevice.deleteMany({ where: { expoPushToken: { in: invalidTokens } } });
  }
}
