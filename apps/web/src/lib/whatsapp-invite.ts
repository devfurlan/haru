import type { Tenant } from '@haru/database';

const API_URL = 'https://graph.facebook.com/v21.0';

interface SendInviteArgs {
  tenant: Pick<
    Tenant,
    | 'name'
    | 'whatsappPhoneNumberId'
    | 'whatsappAccessToken'
    | 'inviteTemplateName'
    | 'inviteTemplateLanguage'
  >;
  /** Telefone do convidado em E.164 sem máscara (ex.: "5511914092346"). */
  toPhone: string;
  /** Nome do convidado (usado só no texto de fallback). */
  inviteeName: string;
  /** Link de ativação que o convidado abre para definir a senha. */
  activationUrl: string;
}

/**
 * Envia o convite de acesso ao painel por WhatsApp. Se o tenant tem template de
 * convite aprovado na Meta, usa template (escapa a janela de 24h); senão cai pro
 * texto simples (só entrega se o convidado falou com o número nas últimas 24h).
 *
 * Fire-and-forget tolerante a erro: retorna `true` se a Meta aceitou, `false` se
 * faltou WhatsApp conectado ou a API recusou. O caller decide o que mostrar
 * (ex.: oferecer o link pra copiar quando não enviou).
 *
 * O telefone vai bruto (E.164) — é valor consumido por máquina (recipient da
 * Cloud API), exceção da convenção de formatação BR.
 */
export async function sendInviteWhatsapp({
  tenant,
  toPhone,
  inviteeName,
  activationUrl,
}: SendInviteArgs): Promise<boolean> {
  if (!tenant.whatsappPhoneNumberId || !tenant.whatsappAccessToken) {
    return false;
  }

  const useTemplate = Boolean(tenant.inviteTemplateName && tenant.inviteTemplateLanguage);

  const body = useTemplate
    ? {
        messaging_product: 'whatsapp',
        to: toPhone,
        type: 'template',
        template: {
          name: tenant.inviteTemplateName,
          language: { code: tenant.inviteTemplateLanguage },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: tenant.name },
                { type: 'text', text: activationUrl },
              ],
            },
          ],
        },
      }
    : {
        messaging_product: 'whatsapp',
        to: toPhone,
        type: 'text',
        text: {
          preview_url: true,
          body:
            `Olá${inviteeName ? `, ${inviteeName}` : ''}! Você foi convidado para acessar o ` +
            `painel de *${tenant.name}* no Demandaê.\n\n` +
            `Ative sua conta e defina sua senha aqui:\n${activationUrl}`,
        },
      };

  try {
    const res = await fetch(`${API_URL}/${tenant.whatsappPhoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tenant.whatsappAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      console.error(`[whatsapp-invite] ${res.status}: ${txt}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[whatsapp-invite] falhou:', err);
    return false;
  }
}
