import { Redis } from '@upstash/redis';

import { Sentry } from '../instrument.js';
import { handleSchedulingFlow } from '../flows/scheduling.js';
import { saveMessage } from '../services/chatHistoryService.js';
import { env } from './env.js';
import { getConversation } from './redis.js';

const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
});

const BUFFER_PREFIX = 'msgbuf:';
const BUFFER_TTL_SECONDS = 180;

export const DEBOUNCE_MS = 6_000;

interface BufferedMessage {
  text: string;
  contactName?: string;
  receivedAt: string;
}

const timers = new Map<string, NodeJS.Timeout>();
const inFlight = new Set<string>();

export interface DebounceArgs {
  phoneNumberId: string;
  phone: string;
  text: string;
  contactName?: string;
  /** Se true, não regrava INBOUND aqui (caller já salvou — útil pra áudio). */
  skipInboundSave?: boolean;
}

function bufferKey(phoneNumberId: string, phone: string) {
  return `${BUFFER_PREFIX}${phoneNumberId}:${phone}`;
}

function timerKey(phoneNumberId: string, phone: string) {
  return `${phoneNumberId}:${phone}`;
}

export async function debounceMessage(args: DebounceArgs): Promise<void> {
  // 1. Salva inbound no histórico imediatamente para que cada mensagem
  //    apareça separadamente no painel ops. Audio handler já salva (com
  //    prefixo 🎤) e passa skipInboundSave=true pra evitar duplicar.
  const state = await getConversation(args.phoneNumberId, args.phone);
  if (!args.skipInboundSave && state?.conversationId) {
    saveMessage(state.conversationId, 'INBOUND', args.text).catch(console.error);
  }

  // 2. Empilha no buffer Redis (sobrevive a reinício do processo).
  await pushBuffer(args.phoneNumberId, args.phone, {
    text: args.text,
    contactName: args.contactName,
    receivedAt: new Date().toISOString(),
  });

  // 3. (Re)agenda timer em memória. Cada nova mensagem reseta a janela.
  const tk = timerKey(args.phoneNumberId, args.phone);
  const existing = timers.get(tk);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    timers.delete(tk);
    flushPhone(args.phoneNumberId, args.phone).catch((err) => {
      console.error('Erro ao fazer flush do debouncer:', err);
      Sentry.captureException(err, {
        tags: { component: 'messageDebouncer' },
        extra: { phone: args.phone, phoneNumberId: args.phoneNumberId },
      });
    });
  }, DEBOUNCE_MS);

  timers.set(tk, timer);
}

async function flushPhone(phoneNumberId: string, phone: string): Promise<void> {
  const tk = timerKey(phoneNumberId, phone);
  if (inFlight.has(tk)) return;
  inFlight.add(tk);

  try {
    const messages = await drainBuffer(phoneNumberId, phone);
    if (messages.length === 0) return;

    const joinedText = messages.map((m) => m.text).join('\n');
    const contactName = messages[messages.length - 1]?.contactName;

    const state = await getConversation(phoneNumberId, phone);
    const currentFlow = state?.flow ?? 'menu';

    if (currentFlow === 'scheduling') {
      await handleSchedulingFlow(phoneNumberId, phone, joinedText, contactName, {
        skipInboundSave: true,
      });
    } else {
      console.warn(
        `[debouncer] Flow "${currentFlow}" não suportado em ${phone}, descartando ${messages.length} msg(s)`,
      );
    }
  } finally {
    inFlight.delete(tk);
  }
}

async function pushBuffer(
  phoneNumberId: string,
  phone: string,
  msg: BufferedMessage,
): Promise<void> {
  const key = bufferKey(phoneNumberId, phone);
  await redis.rpush(key, JSON.stringify(msg));
  await redis.expire(key, BUFFER_TTL_SECONDS);
}

async function drainBuffer(
  phoneNumberId: string,
  phone: string,
): Promise<BufferedMessage[]> {
  const key = bufferKey(phoneNumberId, phone);
  const raw = await redis.lrange<string | BufferedMessage>(key, 0, -1);
  await redis.del(key);

  const parsed: BufferedMessage[] = [];
  for (const item of raw) {
    if (typeof item === 'string') {
      try {
        parsed.push(JSON.parse(item));
      } catch {
        // ignora item malformado
      }
    } else if (item && typeof item === 'object' && 'text' in item) {
      parsed.push(item);
    }
  }
  return parsed;
}
