import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { Sentry } from '../instrument.js';
import { sendMenu, sendServices } from '../flows/menu.js';
import { handleSchedulingFlow } from '../flows/scheduling.js';
import { env } from '../lib/env.js';
import { debounceMessage } from '../lib/messageDebouncer.js';
import { transcribeAudio } from '../lib/openai/audio.js';
import { getConversation, setConversation } from '../lib/redis.js';
import { uploadBotAudio } from '../lib/supabase.js';
import { downloadMedia, markAsRead, verifyWebhookSignature } from '../lib/whatsapp/client.js';
import type { WebhookMessage, WebhookPayload } from '../lib/whatsapp/types.js';
import { sendTextSafely } from '../lib/whatsapp/safeSend.js';
import { getOrCreateConversation, saveMessage } from '../services/chatHistoryService.js';
import { getHandoffStatus, refreshHandoffWindow } from '../services/handoffService.js';
import { findTenantByPhoneNumberId } from '../services/tenantService.js';

export async function webhookRoutes(app: FastifyInstance) {
  // Parser para raw body — necessário pra validação de assinatura HMAC
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (_req, body, done) => {
      done(null, body);
    },
  );

  // GET — verificação do webhook pela Meta
  app.get('/webhook', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as Record<string, string>;
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    if (mode === 'subscribe' && token === env.WHATSAPP_VERIFY_TOKEN) {
      app.log.info('Webhook verificado com sucesso');
      return reply.code(200).send(challenge);
    }

    app.log.warn('Falha na verificação do webhook');
    return reply.code(403).send('Forbidden');
  });

  // POST — recebe mensagens
  app.post('/webhook', async (request: FastifyRequest, reply: FastifyReply) => {
    const rawBody = request.body as Buffer;

    const signature = request.headers['x-hub-signature-256'] as string;
    if (!signature || !verifyWebhookSignature(rawBody, signature)) {
      app.log.warn('Assinatura inválida no webhook');
      return reply.code(401).send('Unauthorized');
    }

    const payload: WebhookPayload = JSON.parse(rawBody.toString());

    // Meta espera resposta rápida — processa em background
    reply.code(200).send('OK');

    processWebhook(payload, app).catch((err) => {
      app.log.error({ err }, 'Erro ao processar webhook');
      Sentry.captureException(err, {
        tags: { component: 'webhook', phase: 'processWebhook' },
      });
    });
  });
}

// Deduplicação simples in-memory (Meta pode reenviar o mesmo webhook)
const processedMessages = new Set<string>();
const MAX_PROCESSED = 1000;

async function processWebhook(payload: WebhookPayload, app: FastifyInstance) {
  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      const messages = change.value.messages;
      if (!messages?.length) continue;

      const phoneNumberId = change.value.metadata.phone_number_id;
      const tenant = await findTenantByPhoneNumberId(phoneNumberId);

      if (!tenant) {
        app.log.warn({ phoneNumberId }, 'Tenant não encontrado para phone_number_id');
        continue;
      }

      for (const message of messages) {
        if (processedMessages.has(message.id)) {
          app.log.info({ messageId: message.id }, 'Mensagem duplicada, ignorando');
          continue;
        }
        processedMessages.add(message.id);
        if (processedMessages.size > MAX_PROCESSED) {
          const first = processedMessages.values().next().value;
          if (first) processedMessages.delete(first);
        }

        const phone = message.from;
        const contactName = change.value.contacts?.[0]?.profile?.name;

        app.log.info(
          {
            tenantId: tenant.id,
            phoneNumberId,
            phone,
            type: message.type,
            contactName,
          },
          'Mensagem recebida',
        );

        try {
          await markAsRead(phoneNumberId, message.id).catch(() => {});
          await routeMessage(tenant.id, phoneNumberId, message, contactName);
        } catch (err) {
          app.log.error({ err, phone }, 'Erro ao processar mensagem');
          Sentry.captureException(err, {
            tags: { component: 'webhook', phase: 'routeMessage' },
            extra: {
              tenantId: tenant.id,
              phone,
              messageId: message.id,
              messageType: message.type,
            },
          });
        }
      }
    }
  }
}

async function routeMessage(
  tenantId: string,
  phoneNumberId: string,
  message: WebhookMessage,
  contactName?: string,
) {
  const phone = message.from;

  const buttonId = message.interactive?.button_reply?.id;
  let text =
    message.text?.body ??
    message.interactive?.button_reply?.title ??
    message.button?.text ??
    message.button?.payload ??
    '';

  // Áudio: baixa, sobe no Storage (fire-and-forget), transcreve e segue como texto.
  // O inbound é salvo aqui com prefixo 🎤 pra dashboard distinguir — debounce
  // recebe skipInboundSave=true pra não duplicar.
  let audioHandled = false;
  if (message.type === 'audio' && message.audio?.id) {
    try {
      const media = await downloadMedia(phoneNumberId, message.audio.id);
      uploadBotAudio(media.buffer, media.mimeType, message.id).catch((err) =>
        console.error('[audio] upload supabase falhou', err),
      );
      const transcript = await transcribeAudio(media.buffer, media.mimeType);

      if (!transcript) {
        await sendTextSafely(
          phoneNumberId,
          phone,
          'Não consegui entender o áudio. Pode tentar de novo ou mandar por texto?',
          { phone, phoneNumberId, tenantId, flow: 'audio-fallback' },
        );
        return;
      }

      const { conversationId } = await getOrCreateConversation(tenantId, phone, contactName);
      saveMessage(conversationId, 'INBOUND', `🎤 ${transcript}`, message.id).catch(console.error);

      text = transcript;
      audioHandled = true;
    } catch (err) {
      console.error('[audio] falha no processamento', err);
      Sentry.captureException(err, {
        tags: { component: 'audio' },
        extra: { tenantId, phone, messageId: message.id },
      });
      await sendTextSafely(
        phoneNumberId,
        phone,
        'Tive um problema ao processar seu áudio. Pode mandar por texto?',
        { phone, phoneNumberId, tenantId, flow: 'audio-fallback' },
      );
      return;
    }
  } else if (
    message.type === 'image' ||
    message.type === 'video' ||
    message.type === 'document' ||
    message.type === 'sticker'
  ) {
    // TODO: ingestão de imagem/PDF/etc. (OCR/visão)
    return;
  }

  // Handoff humano: se o dono assumiu a conversa pelo painel, o bot fica em
  // silêncio — só registra a mensagem do cliente (pro inbox) e renova a janela
  // de 24h. Gate antes dos botões/flows engole até cliques de botão.
  const handoff = await getHandoffStatus(tenantId, phone);
  if (handoff) {
    if (!audioHandled) {
      await saveMessage(handoff.conversationId, 'INBOUND', text, message.id).catch(console.error);
    }
    await refreshHandoffWindow(handoff.conversationId).catch(console.error);
    return;
  }

  const state = await getConversation(phoneNumberId, phone);

  // Cliques nos botões do menu
  if (buttonId) {
    switch (buttonId) {
      case 'schedule': {
        const { conversationId, contactId } = await getOrCreateConversation(
          tenantId,
          phone,
          contactName,
        );
        await setConversation(phoneNumberId, phone, {
          tenantId,
          flow: 'scheduling',
          conversationId,
          contactId,
          createdAt: new Date().toISOString(),
        });
        saveMessage(conversationId, 'INBOUND', 'Agendar horário').catch(console.error);
        return handleSchedulingFlow(phoneNumberId, phone, 'Quero agendar um horário', contactName, {
          skipInboundSave: true,
        });
      }
      case 'services':
        return sendServices(tenantId, phoneNumberId, phone, contactName);
      default:
        return sendMenu(tenantId, phoneNumberId, phone, contactName);
    }
  }

  // Dentro de um fluxo ativo
  if (state) {
    switch (state.flow) {
      case 'scheduling':
        return debounceMessage({
          phoneNumberId,
          phone,
          text,
          contactName,
          skipInboundSave: audioHandled,
        });
      case 'menu':
      default:
        return sendMenu(tenantId, phoneNumberId, phone, contactName);
    }
  }

  // Primeira interação
  return sendMenu(tenantId, phoneNumberId, phone, contactName);
}
