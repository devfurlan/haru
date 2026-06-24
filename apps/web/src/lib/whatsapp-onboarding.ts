import { GRAPH_API_URL } from './whatsapp-graph';

/**
 * Helpers do Embedded Signup da Meta (server-only). Usados pela route
 * /api/whatsapp/embedded-signup para ativar a conexão do tenant.
 *
 * O fluxo do browser (FB.login com response_type=code) devolve um `code`; aqui
 * trocamos por um access_token e assinamos nosso app aos webhooks da WABA do tenant.
 */

export class WhatsappOnboardingError extends Error {}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new WhatsappOnboardingError(`Variável de ambiente ${name} não configurada`);
  }
  return value;
}

/**
 * Troca o `code` do Embedded Signup por um access_token. Não envia redirect_uri
 * (Embedded Signup não usa). Retorna o token cru da Meta.
 */
export async function exchangeCodeForToken(code: string): Promise<string> {
  const appId = requireEnv('NEXT_PUBLIC_FACEBOOK_APP_ID');
  const appSecret = requireEnv('FACEBOOK_APP_SECRET');

  const url =
    `${GRAPH_API_URL}/oauth/access_token` +
    `?client_id=${encodeURIComponent(appId)}` +
    `&client_secret=${encodeURIComponent(appSecret)}` +
    `&code=${encodeURIComponent(code)}`;

  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new WhatsappOnboardingError(`Falha ao trocar code por token (${res.status}): ${txt}`);
  }
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) {
    throw new WhatsappOnboardingError('Meta não retornou access_token');
  }
  return json.access_token;
}

/**
 * Assina nosso app aos webhooks da WABA do tenant. Sem isso, as mensagens do
 * número não chegam no nosso webhook. Idempotente do lado da Meta.
 */
export async function subscribeAppToWaba(wabaId: string, token: string): Promise<void> {
  const res = await fetch(`${GRAPH_API_URL}/${wabaId}/subscribe_apps`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new WhatsappOnboardingError(`Falha em subscribe_apps (${res.status}): ${txt}`);
  }
}

/**
 * Registra o número na Cloud API (necessário só pro fluxo de NÚMERO NOVO).
 * Em coexistence NÃO se chama isto - o número já está ativo no Business App e
 * registrar quebraria a coexistence. A PIN é definida por nós (two-step da Cloud
 * API, não a do app do dono).
 */
export async function registerPhoneNumber(
  phoneNumberId: string,
  token: string,
  pin: string,
): Promise<void> {
  const res = await fetch(`${GRAPH_API_URL}/${phoneNumberId}/register`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messaging_product: 'whatsapp', pin }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new WhatsappOnboardingError(`Falha ao registrar número (${res.status}): ${txt}`);
  }
}
