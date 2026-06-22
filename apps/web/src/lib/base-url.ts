import { headers } from 'next/headers';

/**
 * URL base absoluta da aplicação (ex.: "https://www.demandae.com"), derivada dos
 * headers da request - funciona em dev (localhost) e produção (Vercel) sem env
 * extra. Usado para montar links absolutos enviados pra fora (ex.: convite por
 * WhatsApp). Só pode ser chamado em contexto de request (server action / route).
 */
export async function getBaseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const proto = h.get('x-forwarded-proto') ?? (host?.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}
