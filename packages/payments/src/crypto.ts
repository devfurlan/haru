import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Criptografia de segredos at rest (AES-256-GCM). Usada para guardar credenciais
 * de gateways de pagamento no banco sem expô-las em texto puro.
 *
 * Formato armazenado: "base64(iv):base64(authTag):base64(ciphertext)".
 *  - IV de 12 bytes (padrão GCM), novo a cada cifragem.
 *  - authTag de 16 bytes garante integridade/autenticidade.
 *
 * A chave vem de PAYMENTS_ENCRYPTION_KEY (32 bytes), resolvida de forma preguiçosa
 * - só falha quando alguém efetivamente cifra/decifra, pra não quebrar build/SSG de
 * páginas que não usam pagamento.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const KEY_BYTES = 32;

let cachedKey: Buffer | null = null;

/** Resolve a chave de PAYMENTS_ENCRYPTION_KEY (hex de 64 chars ou base64 de 32 bytes). */
function getKey(): Buffer {
  if (cachedKey) return cachedKey;

  const raw = process.env.PAYMENTS_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      'PAYMENTS_ENCRYPTION_KEY ausente. Gere uma com `openssl rand -hex 32` e configure no .env.',
    );
  }

  let key: Buffer;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    key = Buffer.from(raw, 'hex');
  } else {
    key = Buffer.from(raw, 'base64');
  }

  if (key.length !== KEY_BYTES) {
    throw new Error(
      'PAYMENTS_ENCRYPTION_KEY inválida: esperado 32 bytes (hex de 64 chars ou base64 de 32 bytes).',
    );
  }

  cachedKey = key;
  return key;
}

/** Cifra um segredo. Retorna "iv:tag:ct" (cada parte em base64). */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('base64'), authTag.toString('base64'), ciphertext.toString('base64')].join(
    ':',
  );
}

/** Decifra um valor produzido por `encryptSecret`. Lança se a chave/integridade falharem. */
export function decryptSecret(stored: string): string {
  const parts = stored.split(':');
  if (parts.length !== 3) {
    throw new Error('Segredo criptografado em formato inválido (esperado "iv:tag:ct").');
  }
  const [ivB64, tagB64, ctB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(tagB64, 'base64');
  const ciphertext = Buffer.from(ctB64, 'base64');

  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
}

/**
 * Heurística leve: o valor parece estar no formato cifrado "iv:tag:ct"? Útil para
 * uma migração futura de campos hoje em texto puro (ex.: whatsappAccessToken).
 */
export function isEncrypted(value: string): boolean {
  const parts = value.split(':');
  if (parts.length !== 3) return false;
  return parts.every((p) => p.length > 0 && /^[A-Za-z0-9+/=]+$/.test(p));
}

/** Cifra `value`; `null`/`""` viram `null` (pra colunas opcionais). */
export function encryptNullable(value: string | null | undefined): string | null {
  return value ? encryptSecret(value) : null;
}

/**
 * Decifra um valor de coluna opcional. Se ainda estiver em texto puro (linha antiga,
 * antes do backfill), devolve como está - assim leitura não quebra durante a migração.
 *
 * ponytail: passthrough por `isEncrypted`. Um valor legado em texto puro que por acaso
 * fosse "b64:b64:b64" seria tratado como cifrado e falharia na decifragem - impossível
 * pros campos reais (CPF só dígitos, token da Meta sem `:`). Some após o backfill.
 */
export function decryptNullable(value: string | null | undefined): string | null {
  if (!value) return null;
  return isEncrypted(value) ? decryptSecret(value) : value;
}
