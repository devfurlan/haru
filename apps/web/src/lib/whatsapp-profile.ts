import type { Tenant } from '@haru/database';

const API_URL = 'https://graph.facebook.com/v21.0';

type ProfileTenant = Pick<
  Tenant,
  | 'slug'
  | 'address'
  | 'description'
  | 'whatsappAbout'
  | 'email'
  | 'whatsappPhoneNumberId'
  | 'whatsappAccessToken'
>;

type PictureTenant = Pick<Tenant, 'whatsappPhoneNumberId' | 'whatsappAccessToken'>;

/**
 * Empurra os campos de texto do estabelecimento pro perfil comercial do WhatsApp
 * (endereço, site, descrição, status e e-mail) via Cloud API. Fonte da verdade é
 * o Demandaê - direção única (push). Espelha o padrão de `whatsapp-invite.ts`:
 * fire-and-forget tolerante a erro - retorna `true` se a Meta aceitou, `false` se
 * faltou WhatsApp conectado ou a API recusou. O caller não deve bloquear o save
 * por causa disto.
 *
 * `websiteUrl` é a URL pública absoluta do tenant (ex.: https://www.demandae.com/<slug>),
 * montada pelo caller via `getBaseUrl()`.
 */
export async function syncWhatsappProfile(
  tenant: ProfileTenant,
  websiteUrl: string,
): Promise<boolean> {
  if (!tenant.whatsappPhoneNumberId || !tenant.whatsappAccessToken) {
    return false;
  }

  // Só inclui campos preenchidos - enviar string vazia limparia o campo no perfil.
  const body: Record<string, unknown> = { messaging_product: 'whatsapp' };
  if (tenant.address) body.address = tenant.address;
  if (tenant.description) body.description = tenant.description;
  if (tenant.whatsappAbout) body.about = tenant.whatsappAbout;
  if (tenant.email) body.email = tenant.email;
  if (websiteUrl) body.websites = [websiteUrl];

  try {
    const res = await fetch(
      `${API_URL}/${tenant.whatsappPhoneNumberId}/whatsapp_business_profile`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tenant.whatsappAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
    );

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      console.error(`[whatsapp-profile] sync ${res.status}: ${txt}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[whatsapp-profile] sync falhou:', err);
    return false;
  }
}

/**
 * Descobre o App ID da Meta dono de um access_token, inspecionando o próprio
 * token via `/debug_token`. Evita uma env global de App ID - cada tenant pode
 * estar conectado a um app diferente, e aqui sempre resolvemos o app correto a
 * partir do token daquele tenant. Retorna null se a Meta não devolver o app_id.
 */
async function resolveAppId(token: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${API_URL}/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(token)}`,
    );
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      console.error(`[whatsapp-profile] debug_token ${res.status}: ${txt}`);
      return null;
    }
    const json = (await res.json()) as { data?: { app_id?: string } };
    return json.data?.app_id ?? null;
  } catch (err) {
    console.error('[whatsapp-profile] debug_token falhou:', err);
    return null;
  }
}

/**
 * Sincroniza a foto do perfil comercial do WhatsApp a partir de um JPEG (a Meta
 * não aceita webp). Usa a Resumable Upload API em 3 passos:
 *   1) cria sessão de upload em /{app_id}/uploads
 *   2) envia os bytes e recebe um `handle`
 *   3) seta `profile_picture_handle` no perfil
 *
 * O App ID é derivado do access_token do próprio tenant (via `/debug_token`), sem
 * env nem campo no banco. Fire-and-forget como `syncWhatsappProfile`.
 */
export async function uploadWhatsappProfilePicture(
  tenant: PictureTenant,
  jpeg: Buffer,
): Promise<boolean> {
  if (!tenant.whatsappPhoneNumberId || !tenant.whatsappAccessToken) {
    return false;
  }

  const token = tenant.whatsappAccessToken;

  const appId = await resolveAppId(token);
  if (!appId) {
    console.warn('[whatsapp-profile] não foi possível resolver o App ID do token - foto pulada.');
    return false;
  }

  try {
    // 1) cria sessão de upload
    const startRes = await fetch(
      `${API_URL}/${appId}/uploads?file_length=${jpeg.length}&file_type=image/jpeg`,
      { method: 'POST', headers: { Authorization: `Bearer ${token}` } },
    );
    if (!startRes.ok) {
      const txt = await startRes.text().catch(() => '');
      console.error(`[whatsapp-profile] foto: criar sessão ${startRes.status}: ${txt}`);
      return false;
    }
    const { id: sessionId } = (await startRes.json()) as { id: string };

    // 2) envia os bytes - obtém o handle. Resumable Upload usa esquema `OAuth`.
    const uploadRes = await fetch(`${API_URL}/${sessionId}`, {
      method: 'POST',
      headers: { Authorization: `OAuth ${token}`, file_offset: '0' },
      body: new Uint8Array(jpeg),
    });
    if (!uploadRes.ok) {
      const txt = await uploadRes.text().catch(() => '');
      console.error(`[whatsapp-profile] foto: upload ${uploadRes.status}: ${txt}`);
      return false;
    }
    const { h: handle } = (await uploadRes.json()) as { h: string };

    // 3) aplica o handle no perfil
    const setRes = await fetch(
      `${API_URL}/${tenant.whatsappPhoneNumberId}/whatsapp_business_profile`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          profile_picture_handle: handle,
        }),
      },
    );
    if (!setRes.ok) {
      const txt = await setRes.text().catch(() => '');
      console.error(`[whatsapp-profile] foto: aplicar handle ${setRes.status}: ${txt}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[whatsapp-profile] foto falhou:', err);
    return false;
  }
}
