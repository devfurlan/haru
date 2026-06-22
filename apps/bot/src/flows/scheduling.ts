import { askBot } from '../lib/openai/responses.js';
import { BOT_MODEL, SCHEDULER_SYSTEM_PROMPT } from '../lib/openai/prompts/index.js';
import { TOOLS } from '../lib/openai/tools.js';
import {
  getConversation,
  setConversation,
  type ConversationState,
} from '../lib/redis.js';
import { sendTextSafely } from '../lib/whatsapp/safeSend.js';
import {
  getOrCreateConversation,
  saveMessage,
} from '../services/chatHistoryService.js';
import { buildTenantContext } from '../services/tenantContextService.js';
import { recordAiUsage } from '../services/aiUsageService.js';

interface HandleSchedulingOptions {
  /** Se true, não regrava o INBOUND (debouncer já gravou cada mensagem). */
  skipInboundSave?: boolean;
}

/**
 * Fluxo principal: agendamento conduzido pelo LLM.
 *
 * Na primeira chamada (sem `lastResponseId`), injetamos um snapshot do tenant
 * (serviços, horários, agendamentos próximos) como `primerContext`. A
 * Responses API encadeia os turnos seguintes via `previous_response_id`, então
 * não precisamos repetir o snapshot.
 */
export async function handleSchedulingFlow(
  phoneNumberId: string,
  phone: string,
  text: string,
  contactName?: string,
  options: HandleSchedulingOptions = {},
) {
  let state = await getConversation(phoneNumberId, phone);

  if (!state) {
    console.warn(`[scheduling] sem estado para ${phoneNumberId}:${phone}`);
    return;
  }

  // Garante conversation/contact persistidos
  if (!state.conversationId || !state.contactId) {
    const ids = await getOrCreateConversation(state.tenantId, phone, contactName);
    state = {
      ...state,
      conversationId: ids.conversationId,
      contactId: ids.contactId,
    };
    await setConversation(phoneNumberId, phone, state);
  }

  if (!options.skipInboundSave && state.conversationId) {
    saveMessage(state.conversationId, 'INBOUND', text).catch(console.error);
  }

  // Primeiro turno do fluxo? Carrega snapshot do tenant uma vez.
  const isFirstTurn = !state.lastResponseId;
  const primerContext = isFirstTurn
    ? await buildTenantContext(state.tenantId, state.contactId)
    : undefined;

  const { reply, responseId, usage } = await askBot({
    instructions: SCHEDULER_SYSTEM_PROMPT,
    userMessage: text,
    previousResponseId: state.lastResponseId,
    pendingAssistantNote: state.pendingAssistantNote,
    primerContext,
    tools: TOOLS,
    toolContext: { tenantId: state.tenantId, contactId: state.contactId! },
  });

  // Consumo de tokens por tenant (fire-and-forget, não bloqueia a resposta).
  recordAiUsage({
    tenantId: state.tenantId,
    conversationId: state.conversationId,
    model: BOT_MODEL,
    usage,
  }).catch(console.error);

  const sent = await sendTextSafely(phoneNumberId, phone, reply, {
    phone,
    phoneNumberId,
    tenantId: state.tenantId,
    conversationId: state.conversationId,
    flow: 'scheduling',
  });

  if (!sent) return;

  if (state.conversationId) {
    saveMessage(state.conversationId, 'OUTBOUND', reply).catch(console.error);
  }

  const nextState: ConversationState = {
    ...state,
    flow: 'scheduling',
    lastResponseId: responseId,
    pendingAssistantNote: undefined,
  };
  await setConversation(phoneNumberId, phone, nextState);
}
