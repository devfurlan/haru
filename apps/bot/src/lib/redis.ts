import { Redis } from '@upstash/redis';

import { env } from './env.js';

const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
});

const TTL_SECONDS = 24 * 60 * 60; // 24h
const keyPrefix = 'whatsapp:';

export type BotFlow = 'menu' | 'scheduling' | 'support' | 'handoff';

export interface ConversationState {
  /** Tenant resolvido a partir do phone_number_id do webhook. */
  tenantId: string;
  flow: BotFlow;
  /** response.id do último turno (OpenAI Responses API) para encadear via previous_response_id. */
  lastResponseId?: string;
  /** Texto a ser injetado como fala anterior do assistant no próximo turno. Limpo após aplicado. */
  pendingAssistantNote?: string;
  /** ID interno da Conversation no Postgres. */
  conversationId?: string;
  /** ID interno do Contact no Postgres. */
  contactId?: string;
  createdAt: string;
}

function key(phoneNumberId: string, phone: string) {
  return `${keyPrefix}${phoneNumberId}:${phone}`;
}

export async function getConversation(
  phoneNumberId: string,
  phone: string,
): Promise<ConversationState | null> {
  const raw = await redis.get<ConversationState>(key(phoneNumberId, phone));
  return raw ?? null;
}

export async function setConversation(
  phoneNumberId: string,
  phone: string,
  state: ConversationState,
) {
  await redis.set(key(phoneNumberId, phone), state, { ex: TTL_SECONDS });
}

export async function deleteConversation(phoneNumberId: string, phone: string) {
  await redis.del(key(phoneNumberId, phone));
}

export { redis };
