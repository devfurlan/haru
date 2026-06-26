import crypto from 'node:crypto';

import { env } from '../env.js';
import prisma from '../prisma.js';
import type { InteractiveButton } from './types.js';

const API_URL = 'https://graph.facebook.com/v21.0';

/**
 * Cache simples (phone_number_id → access_token) com TTL de 5 min. Evita
 * roundtrip ao DB a cada envio. Invalidação acontece naturalmente quando o
 * usuário atualiza o token em /settings - vai pegar o novo no próximo ciclo.
 */
const tokenCache = new Map<string, { token: string; expiresAt: number }>();
const TOKEN_TTL_MS = 5 * 60 * 1000;

async function tokenFor(phoneNumberId: string): Promise<string> {
  const cached = tokenCache.get(phoneNumberId);
  if (cached && cached.expiresAt > Date.now()) return cached.token;

  const tenant = await prisma.tenant.findUnique({
    where: { whatsappPhoneNumberId: phoneNumberId },
    select: { whatsappAccessToken: true },
  });

  const token = tenant?.whatsappAccessToken ?? env.WHATSAPP_PLATFORM_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      `Sem access_token para phone_number_id ${phoneNumberId} ` +
        `(tenant não cadastrou via /settings e WHATSAPP_PLATFORM_ACCESS_TOKEN não está setado)`,
    );
  }

  tokenCache.set(phoneNumberId, { token, expiresAt: Date.now() + TOKEN_TTL_MS });
  return token;
}

/** Limpa o cache de token de um phone_number_id específico. */
export function invalidateTokenCache(phoneNumberId: string) {
  tokenCache.delete(phoneNumberId);
}

export type PhoneNumberStatus = {
  status?: string; // CONNECTED | BANNED | RESTRICTED | ...
  name_status?: string; // APPROVED | DECLINED | ...
  code_verification_status?: string;
  quality_rating?: string; // GREEN | YELLOW | RED
};

/**
 * Lê o status do número no nó do phone_number_id (Graph API). Usado pra confirmar
 * banimento quando um envio falha com o erro genérico (#135000), que não diz o
 * motivo real. Best-effort: qualquer falha retorna null (não sabemos = não marca).
 */
export async function getPhoneNumberStatus(
  phoneNumberId: string,
): Promise<PhoneNumberStatus | null> {
  try {
    const token = await tokenFor(phoneNumberId);
    const fields = 'status,name_status,code_verification_status,quality_rating';
    const res = await fetch(`${API_URL}/${phoneNumberId}?fields=${fields}&access_token=${token}`);
    if (!res.ok) return null;
    return (await res.json()) as PhoneNumberStatus;
  } catch {
    return null;
  }
}

async function callApi(
  phoneNumberId: string,
  endpoint: string,
  body: Record<string, unknown>,
) {
  const url = `${API_URL}/${phoneNumberId}/${endpoint}`;
  const token = await tokenFor(phoneNumberId);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`WhatsApp API error (${response.status}): ${error}`);
  }

  return response.json();
}

export async function sendTextMessage(phoneNumberId: string, to: string, text: string) {
  return callApi(phoneNumberId, 'messages', {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: text },
  });
}

export async function sendInteractiveButtons(
  phoneNumberId: string,
  to: string,
  bodyText: string,
  buttons: InteractiveButton[],
) {
  return callApi(phoneNumberId, 'messages', {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: bodyText },
      action: { buttons },
    },
  });
}

/**
 * Concatena labels dos botões ao texto para salvar no histórico - sem isso
 * o painel exibe só o prompt e não as opções oferecidas.
 */
export function formatInteractiveContent(bodyText: string, buttons: InteractiveButton[]): string {
  if (!buttons.length) return bodyText;
  const labels = buttons.map((b) => `• ${b.reply.title}`).join('\n');
  return `${bodyText}\n\n${labels}`;
}

export async function sendTemplateMessage(
  phoneNumberId: string,
  to: string,
  templateName: string,
  languageCode: string,
  components?: Array<Record<string, unknown>>,
) {
  return callApi(phoneNumberId, 'messages', {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      ...(components ? { components } : {}),
    },
  });
}

export async function markAsRead(phoneNumberId: string, messageId: string) {
  return callApi(phoneNumberId, 'messages', {
    messaging_product: 'whatsapp',
    status: 'read',
    message_id: messageId,
  });
}

const MEDIA_MAX_BYTES = 25 * 1024 * 1024;

/**
 * Baixa o binário de uma mídia da WhatsApp Cloud API (2 hops: metadata + URL).
 * Retorna o Buffer + mime + tamanho. O token usado é o do tenant dono do
 * phone_number_id (resolvido em `tokenFor`).
 */
export async function downloadMedia(
  phoneNumberId: string,
  mediaId: string,
): Promise<{ buffer: Buffer; mimeType: string; fileSize: number }> {
  const token = await tokenFor(phoneNumberId);

  // 1) metadata + URL temporária (~5min de validade)
  const metaRes = await fetch(`${API_URL}/${mediaId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!metaRes.ok) {
    const err = await metaRes.text();
    throw new Error(`WhatsApp media metadata error (${metaRes.status}): ${err}`);
  }
  const meta = (await metaRes.json()) as {
    url: string;
    mime_type: string;
    file_size: number;
  };
  if (meta.file_size > MEDIA_MAX_BYTES) {
    throw new Error(
      `Arquivo excede o limite suportado (${meta.file_size} > ${MEDIA_MAX_BYTES} bytes)`,
    );
  }

  // 2) download binário (mesmo token Bearer)
  const binRes = await fetch(meta.url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!binRes.ok) {
    const err = await binRes.text();
    throw new Error(`WhatsApp media download error (${binRes.status}): ${err}`);
  }
  const arrayBuf = await binRes.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuf),
    mimeType: meta.mime_type,
    fileSize: meta.file_size,
  };
}

export function verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
  const expectedSignature =
    'sha256=' +
    crypto.createHmac('sha256', env.WHATSAPP_APP_SECRET).update(rawBody).digest('hex');

  return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));
}
