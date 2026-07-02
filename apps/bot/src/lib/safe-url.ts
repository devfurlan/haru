import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

// Espelho de apps/web/src/lib/safe-url.ts (o dispatcher de webhook é duplicado web/bot de
// propósito). Guarda contra SSRF: o `notificationWebhookUrl` é configurável pelo dono e
// vira um POST server-side a partir do egress do bot. Bloqueia loopback/rede interna/
// link-local/metadata e exige https:443. Se divergir, refletir nos dois.

function ipv4IsBlocked(ip: string): boolean {
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;
  const [a, b] = p;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true; // link-local + cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true;
  return false;
}

function ipIsBlocked(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return ipv4IsBlocked(ip);
  if (version === 6) {
    const lower = ip.toLowerCase();
    if (lower === '::1' || lower === '::') return true;
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return ipv4IsBlocked(mapped[1]);
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
    if (/^fe[89ab]/.test(lower)) return true;
    return false;
  }
  return true;
}

/** `true` só se https:443 e o host resolver APENAS para IPs públicos. */
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
    return false;
  }
}
