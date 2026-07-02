import 'server-only';

import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

// Guarda contra SSRF no webhook de notificações do tenant (URL configurável pelo dono).
// Sem isso, um webhook apontando pra `https://169.254.169.254/...` ou pra um serviço da
// rede interna vira um POST server-side, a partir do IP de saída de produção, disparado
// por eventos de agendamento/pagamento. Bloqueia loopback/privado/link-local/metadata e
// exige https na porta 443. Resolve o DNS e checa TODOS os IPs (também no dispatch, como
// defesa contra DNS rebinding).

/** IPv4 em faixa privada/reservada/loopback/link-local (inclui 169.254.169.254 = metadata). */
function ipv4IsBlocked(ip: string): boolean {
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;
  const [a, b] = p;
  if (a === 0 || a === 10 || a === 127) return true; // "this", private, loopback
  if (a === 169 && b === 254) return true; // link-local + cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast + reservado
  return false;
}

/** Qualquer IP (v4/v6) que não deva ser alcançado a partir do servidor. */
function ipIsBlocked(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return ipv4IsBlocked(ip);
  if (version === 6) {
    const lower = ip.toLowerCase();
    if (lower === '::1' || lower === '::') return true; // loopback / unspecified
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/); // IPv4-mapped
    if (mapped) return ipv4IsBlocked(mapped[1]);
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // fc00::/7 unique-local
    if (/^fe[89ab]/.test(lower)) return true; // fe80::/10 link-local
    return false;
  }
  return true; // não é IP válido = bloqueia
}

/**
 * `true` só se a URL for https na porta 443 e o host resolver APENAS para IPs públicos.
 * Qualquer falha (não-https, porta != 443, DNS que não resolve, IP privado) = `false`.
 */
export async function isPublicWebhookUrl(raw: string): Promise<boolean> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:') return false;
  if (url.port && url.port !== '443') return false;
  try {
    const results = await lookup(url.hostname, { all: true });
    if (!results.length) return false;
    return !results.some((r) => ipIsBlocked(r.address));
  } catch {
    return false; // não resolve = bloqueia
  }
}
