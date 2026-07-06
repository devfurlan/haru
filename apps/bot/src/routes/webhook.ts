import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { isAddonActive } from '@haru/billing';

import { Sentry } from '../instrument.js';
import { env } from '../lib/env.js';
import { debounceMessage } from '../lib/messageDebouncer.js';
import prisma from '../lib/prisma.js';
import { transcribeAudio } from '../lib/openai/audio.js';
import { getConversation, setConversation } from '../lib/redis.js';
import { uploadBotAudio } from '../lib/supabase.js';
import { downloadMedia, markAsRead, verifyWebhookSignature } from '../lib/whatsapp/client.js';
import type { WebhookMessage, WebhookPayload } from '../lib/whatsapp/types.js';
import { sendTextSafely } from '../lib/whatsapp/safeSend.js';
import { getOrCreateConversation, saveMessage } from '../services/chatHistoryService.js';
import {
  getHandoffStatus,
  initiateHandoff,
  pauseBotForOwnerReply,
  refreshHandoffWindow,
} from '../services/handoffService.js';
import { findTenantByPhoneNumberId } from '../services/tenantService.js';

/**
 * Heurística para "quero falar com um humano" em texto livre. Cobre o fluxo de
 * menu/primeiro contato, onde a LLM (que tem a tool request_human_support) nunca
 * roda. Lista enxuta e específica de propósito - o caso ambíguo fica pro LLM no
 * fluxo de agendamento. Normaliza acentos antes de testar.
 */
function looksLikeHumanRequest(raw: string): boolean {
  const t = raw.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return (
    /\batendente\b/.test(t) ||
    /\bhumano\b/.test(t) ||
    /(falar|conversar|atendid[oa])\s+(com\s+)?((o|a|os|as|um|uma)\s+)?(pessoa|gente|alguem|responsavel|dono|humano|atendente)/.test(
      t,
    ) ||
    /(quero|queria|preciso|pode chamar|chama|chamar|me passa)\b.{0,20}\b(humano|atendente)\b/.test(
      t,
    ) ||
    /pessoa de verdade/.test(t)
  );
}

/**
 * Heurística de opt-out de lembretes (convenção "PARAR"/"SAIR" que a Meta espera).
 * Deliberadamente conservadora pra NÃO desinscrever por engano: a palavra solta
 * ("parar"/"sair"/"stop") só conta se for a mensagem inteira; frases exigem intenção
 * explícita de não receber. NÃO cobre "cancelar" sozinho - colide com cancelamento
 * de agendamento, que é outro fluxo. Normaliza acentos antes de testar.
 */
function looksLikeStopRequest(raw: string): boolean {
  const t = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
  return (
    /^(parar|sair|stop|pare)$/.test(t) ||
    /\bdescadastr/.test(t) ||
    /\b(nao|n) quero (mais )?receber/.test(t) ||
    /\bpar(ar|a|e) de (me )?(enviar|mandar)/.test(t) ||
    /\bnao (me )?(envie|mande|manda) mais/.test(t) ||
    /\bcancelar (a )?inscri/.test(t) ||
    /\bcancelar (os |as )?(lembrete|aviso|mensage|notifica)/.test(t) ||
    /\b(remover|tirar) .{0,15}(lista|lembrete)/.test(t)
  );
}

export async function webhookRoutes(app: FastifyInstance) {
  // Parser para raw body - necessário pra validação de assinatura HMAC
  app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_req, body, done) => {
    done(null, body);
  });

  // GET - verificação do webhook pela Meta
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

  // POST - recebe mensagens
  app.post('/webhook', async (request: FastifyRequest, reply: FastifyReply) => {
    const rawBody = request.body as Buffer;

    const signature = request.headers['x-hub-signature-256'] as string;
    if (!signature || !verifyWebhookSignature(rawBody, signature)) {
      app.log.warn('Assinatura inválida no webhook');
      return reply.code(401).send('Unauthorized');
    }

    const payload: WebhookPayload = JSON.parse(rawBody.toString());

    // Meta espera resposta rápida - processa em background
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
      // Coexistence: mensagens que o dono mandou pelo celular chegam aqui.
      const echoes = change.value.message_echoes;
      if (!messages?.length && !echoes?.length) continue;

      const phoneNumberId = change.value.metadata.phone_number_id;
      const tenant = await findTenantByPhoneNumberId(phoneNumberId);

      if (!tenant) {
        app.log.warn({ phoneNumberId }, 'Tenant não encontrado para phone_number_id');
        continue;
      }

      // Bot conversacional inbound é EXCLUSIVO do addon "Atendente IA no WhatsApp": nenhum
      // plano base inclui atendimento inbound. Sem o addon ativo, não processa. Cobre as duas
      // variantes de canal do addon (número próprio ou número Demandaê) - isAddonActive já
      // exige assinatura base ativa + addon ativado.
      if (!isAddonActive(tenant.subscription)) {
        app.log.warn(
          { tenantId: tenant.id, status: tenant.subscription?.status ?? 'none' },
          'Sem addon Atendente IA ativo - bot não responde',
        );
        continue;
      }

      // Coexistence: o dono respondeu o cliente pelo WhatsApp Business App.
      // Registra a mensagem no histórico e pausa o bot pra aquele cliente.
      if (echoes?.length) {
        for (const echo of echoes) {
          if (processedMessages.has(echo.id)) continue;
          processedMessages.add(echo.id);
          if (processedMessages.size > MAX_PROCESSED) {
            const first = processedMessages.values().next().value;
            if (first) processedMessages.delete(first);
          }
          try {
            await handleOwnerEcho(tenant.id, echo);
          } catch (err) {
            app.log.error({ err, echoId: echo.id }, 'Erro ao processar echo do dono');
            Sentry.captureException(err, {
              tags: { component: 'webhook', phase: 'handleOwnerEcho' },
              extra: { tenantId: tenant.id, echoId: echo.id },
            });
          }
        }
      }

      if (!messages?.length) continue;

      for (const message of messages) {
        // Cinto e suspensório: em coexistence as mensagens do dono vêm em
        // `message_echoes`, não aqui. Mas se a Meta mandar uma com `from` = número
        // do próprio negócio, ignoramos pra o bot nunca responder a si mesmo.
        if (message.from === change.value.metadata.display_phone_number) {
          continue;
        }

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

/**
 * Coexistence: o dono respondeu o cliente pelo WhatsApp Business App (echo via
 * `smb_message_echoes`). Salva a mensagem como OUTBOUND no histórico (pra o painel
 * mostrar o atendimento humano) e pausa o bot pra aquele cliente, reusando o handoff.
 */
async function handleOwnerEcho(tenantId: string, echo: WebhookMessage) {
  const customerPhone = echo.to;
  if (!customerPhone) return; // sem destino não dá pra associar a um cliente

  const text =
    echo.text?.body ??
    echo.interactive?.button_reply?.title ??
    echo.button?.text ??
    (echo.type !== 'text' ? `[${echo.type}]` : '');

  const { conversationId } = await getOrCreateConversation(tenantId, customerPhone);
  await saveMessage(conversationId, 'OUTBOUND', text, echo.id).catch(console.error);
  await pauseBotForOwnerReply(conversationId).catch(console.error);
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
  // O inbound é salvo aqui com prefixo 🎤 pra dashboard distinguir - debounce
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
  // silêncio - só registra a mensagem do cliente (pro inbox) e renova a janela
  // de 24h. Gate antes dos botões/flows engole até cliques de botão.
  const handoff = await getHandoffStatus(tenantId, phone);
  if (handoff) {
    if (!audioHandled) {
      await saveMessage(handoff.conversationId, 'INBOUND', text, message.id).catch(console.error);
    }
    await refreshHandoffWindow(handoff.conversationId).catch(console.error);
    return;
  }

  // Opt-out de lembretes ("PARAR"/"SAIR"). Sem mecanismo de sair, o cliente
  // insatisfeito bloqueia/denuncia - e denúncia derruba a quality rating e leva a
  // restrição pela Meta. Marca o contato e para os lembretes por WhatsApp; o painel
  // vê a mensagem no histórico. Não passa pelo LLM.
  if (!buttonId && text && looksLikeStopRequest(text)) {
    const { conversationId, contactId } = await getOrCreateConversation(
      tenantId,
      phone,
      contactName,
    );
    if (!audioHandled) {
      await saveMessage(conversationId, 'INBOUND', text, message.id).catch(console.error);
    }
    await prisma.contact
      .update({ where: { id: contactId }, data: { remindersOptOutAt: new Date() } })
      .catch(console.error);
    const reply =
      'Prontinho, não vou mais te enviar lembretes por aqui. 🙂 Se quiser agendar ou ' +
      'voltar a receber, é só me chamar quando precisar.';
    await sendTextSafely(phoneNumberId, phone, reply, {
      phone,
      phoneNumberId,
      tenantId,
      flow: 'opt-out',
    });
    await saveMessage(conversationId, 'OUTBOUND', reply).catch(console.error);
    return;
  }

  // Pedido explícito de atendimento humano em texto livre. Cobre o fluxo de
  // menu/primeiro contato (sem LLM); dentro do agendamento a própria tool
  // request_human_support cuida do caso, mas um pedido explícito aqui também
  // dispara o handoff e cala o bot.
  if (!buttonId && text && looksLikeHumanRequest(text)) {
    const { conversationId, contactId } = await getOrCreateConversation(
      tenantId,
      phone,
      contactName,
    );
    if (!audioHandled) {
      await saveMessage(conversationId, 'INBOUND', text, message.id).catch(console.error);
    }
    await initiateHandoff({ tenantId, contactId, conversationId }).catch(console.error);
    const reply = 'Beleza! Já avisei o responsável - em breve alguém te responde por aqui. 🙂';
    await sendTextSafely(phoneNumberId, phone, reply, {
      phone,
      phoneNumberId,
      tenantId,
      flow: 'handoff',
    });
    await saveMessage(conversationId, 'OUTBOUND', reply).catch(console.error);
    return;
  }

  // A conversa é SEMPRE conduzida pelo LLM, em linguagem natural - sem menu de
  // botões. Primeira mensagem, retomada ou texto fora de fluxo: tudo entra no
  // mesmo fluxo conversacional, pra o bot entender o que a pessoa escreveu e
  // responder de verdade. (Cliques em botões legados chegam como texto via
  // `button_reply.title`, então também caem aqui naturalmente.)
  const state = await getConversation(phoneNumberId, phone);

  if (!state || state.flow !== 'scheduling') {
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
      createdAt: state?.createdAt ?? new Date().toISOString(),
      // Preserva o encadeamento do LLM ao migrar um estado legado ('menu').
      lastResponseId: state?.lastResponseId,
      pendingAssistantNote: state?.pendingAssistantNote,
    });
  }

  return debounceMessage({
    phoneNumberId,
    phone,
    text,
    contactName,
    skipInboundSave: audioHandled,
  });
}
