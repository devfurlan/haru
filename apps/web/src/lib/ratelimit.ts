// Rate-limit por IP dos endpoints públicos do app mobile (pay/bookings/slots, sem Bearer).
// Reusa o MESMO Upstash Redis do bot - só troca o prefixo de chave (`ratelimit:` vs
// `whatsapp:`), sem colisão. Janela fixa via INCR+EXPIRE atômico (Lua eval); barrar abuso
// não precisa do sliding-window do @upstash/ratelimit, então sem lib extra.
import { headers } from 'next/headers';

import { Redis } from '@upstash/redis';

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
// Sem creds (dev sem Redis) o helper vira no-op fail-open - não trava o fluxo local.
const redis = url && token ? new Redis({ url, token }) : null;

// INCR + EXPIRE (só no 1o hit) num passo atômico. Sem o eval, um crash entre os dois
// deixaria a chave sem TTL e bloquearia o IP pra sempre.
const INCR_WINDOW = `
local n = redis.call('INCR', KEYS[1])
if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
return n
`;

function clientIp(req: Request): string {
  // Vercel seta x-real-ip com o IP real da conexão (não spoofável pelo cliente).
  // x-forwarded-for (1o item) como fallback; 'unknown' agrupa quem não tiver - aceitável.
  return (
    req.headers.get('x-real-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

/**
 * `true` = dentro do limite (siga); `false` = estourou (responda 429). `name` separa os
 * buckets por rota. Fail-open: qualquer erro do Redis libera - o throttle não pode
 * derrubar um agendamento ou pagamento legítimo.
 */
export async function withinRateLimit(
  req: Request,
  name: string,
  limit: number,
  windowSec: number,
): Promise<boolean> {
  return withinRateLimitFor(clientIp(req), name, limit, windowSec);
}

/**
 * Como `withinRateLimit`, mas com a chave do bucket explícita (ex.: `account.id`) em vez do
 * IP. Usado onde o abuso é por conta autenticada - troca de telefone/OTP (custo de SMS),
 * suporte com IA (custo de LLM) - e o IP sozinho é fácil de trocar.
 */
export async function withinRateLimitFor(
  key: string,
  name: string,
  limit: number,
  windowSec: number,
): Promise<boolean> {
  if (!redis) return true;
  try {
    const count = await redis.eval(INCR_WINDOW, [`ratelimit:${name}:${key}`], [windowSec]);
    return (count as number) <= limit;
  } catch {
    return true; // ponytail: fail-open - Redis fora não bloqueia o fluxo
  }
}

/**
 * Variante por IP para Server Actions (que não recebem um `Request`): lê o IP dos headers
 * da requisição via `next/headers`. Mesmo bucketing/fail-open das demais.
 */
export async function withinRateLimitByIp(
  name: string,
  limit: number,
  windowSec: number,
): Promise<boolean> {
  const h = await headers();
  const ip = h.get('x-real-ip') || h.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  return withinRateLimitFor(ip, name, limit, windowSec);
}
