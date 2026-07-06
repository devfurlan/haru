import 'server-only';

import { prisma } from '@haru/database';

import { GRAPH_API_URL } from '@/lib/whatsapp-graph';

/**
 * Alertas por WhatsApp destinados ao DONO do estabelecimento (uso/cobrança), enviados pelo
 * número da PLATAFORMA Demandaê - NUNCA pelo número do bot do tenant (que é canal de
 * atendimento ao cliente final). Requer templates aprovados na Meta na conta da plataforma
 * (ver README) + as envs abaixo. Env-gated e fail-soft: sem config vira no-op logado, igual
 * ao e-mail. O e-mail sempre sai; o WhatsApp é reforço opt-in.
 *
 * Envs: WHATSAPP_PLATFORM_PHONE_NUMBER_ID, WHATSAPP_PLATFORM_ACCESS_TOKEN (o mesmo do bot),
 *       WHATSAPP_TEMPLATE_PAYMENT_FAILED (nome do template aprovado).
 */

/**
 * Envia um template aprovado pelo número da plataforma ao celular (E.164) do dono.
 * `params` na ORDEM aprovada na Meta. Retorna true se enviou, false se faltou config/erro.
 */
export async function sendPlatformWhatsapp(
  toE164: string,
  templateName: string | undefined,
  params: string[],
  language = 'pt_BR',
): Promise<boolean> {
  const phoneNumberId = process.env.WHATSAPP_PLATFORM_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_PLATFORM_ACCESS_TOKEN;
  if (!phoneNumberId || !token || !templateName) {
    console.warn(
      '[comms-wa] plataforma não configurada (WHATSAPP_PLATFORM_* / template ausente) - WhatsApp não enviado',
    );
    return false;
  }
  try {
    const res = await fetch(`${GRAPH_API_URL}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: toE164,
        type: 'template',
        template: {
          name: templateName,
          language: { code: language },
          components: [
            { type: 'body', parameters: params.map((text) => ({ type: 'text', text })) },
          ],
        },
      }),
    });
    if (!res.ok) {
      console.error('[comms-wa] plataforma', res.status, await res.text().catch(() => ''));
      return false;
    }
    return true;
  } catch (err) {
    console.error('[comms-wa] falhou', err);
    return false;
  }
}

/**
 * Resolve o destino do alerta WhatsApp pro dono, respeitando o opt-in. Retorna null (não
 * enviar) quando o tenant não ligou os alertas OU o OWNER não tem telefone cadastrado.
 */
export async function resolveOwnerWhatsapp(
  tenantId: string,
): Promise<{ phone: string; tenantName: string } | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true, ownerWhatsappAlertsEnabled: true },
  });
  if (!tenant || !tenant.ownerWhatsappAlertsEnabled) return null;

  const owner = await prisma.user.findFirst({
    where: { tenantId, role: 'OWNER' },
    select: { phone: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!owner?.phone) return null;
  return { phone: owner.phone, tenantName: tenant.name };
}
