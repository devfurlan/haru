import { Sentry } from '../../instrument.js';
import { sendTextMessage } from './client.js';

export interface SafeSendContext {
  phone?: string;
  phoneNumberId?: string;
  tenantId?: string;
  conversationId?: string;
  flow?: string;
}

/**
 * Envia texto via WhatsApp com 1 retry e captura no Sentry em caso de falha
 * persistente. Retorna `true` se entregou, `false` se desistiu.
 *
 * O caller deve usar o retorno pra decidir se atualiza estado do Redis. Não
 * envenenar `lastResponseId`/`pendingAssistantNote` quando o envio falhou
 * permite que o próximo turno do usuário re-tente naturalmente.
 */
export async function sendTextSafely(
  phoneNumberId: string,
  to: string,
  text: string,
  context?: SafeSendContext,
): Promise<boolean> {
  try {
    await sendTextMessage(phoneNumberId, to, text);
    return true;
  } catch (err1) {
    console.error('[whatsapp] envio falhou (tentativa 1):', err1);
    await new Promise((r) => setTimeout(r, 1000));
    try {
      await sendTextMessage(phoneNumberId, to, text);
      return true;
    } catch (err2) {
      console.error('[whatsapp] envio falhou (tentativa 2):', err2);
      Sentry.captureException(err2, {
        tags: { whatsapp_send_failed: 'true', flow: context?.flow ?? 'unknown' },
        extra: {
          to,
          textPreview: text.slice(0, 200),
          textLength: text.length,
          phoneNumberId: phoneNumberId,
          conversationId: context?.conversationId,
          tenantId: context?.tenantId,
          phone: context?.phone,
        },
      });
      return false;
    }
  }
}
