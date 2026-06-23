import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Criptografia de segredos at rest (AES-256-GCM) — credenciais de gateway.
 *
 * ESPELHO EXATO de `packages/payments/src/crypto.ts`. Reimplementado aqui (e não
 * importado de `@haru/payments`) porque o turbopack do Next não resolve os imports
 * `.js` daquele pacote multi-arquivo. O FORMATO precisa permanecer idêntico
 * ("base64(iv):base64(tag):base64(ct)", AES-256-GCM, mesma PAYMENTS_ENCRYPTION_KEY)
 * para que web/bot decifrem o que o admin cifra e vice-versa. Não divergir.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const KEY_BYTES = 32;

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;

  const raw = process.env.PAYMENTS_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      'PAYMENTS_ENCRYPTION_KEY ausente. Gere uma com `openssl rand -hex 32` e configure no .env.',
    );
  }

  const key = /^[0-9a-fA-F]{64}$/.test(raw)
    ? Buffer.from(raw, 'hex')
    : Buffer.from(raw, 'base64');
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

/** Decifra um valor produzido por `encryptSecret`. */
export function decryptSecret(stored: string): string {
  const parts = stored.split(':');
  if (parts.length !== 3) {
    throw new Error('Segredo criptografado em formato inválido (esperado "iv:tag:ct").');
  }
  const [ivB64, tagB64, ctB64] = parts;
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ctB64, 'base64')),
    decipher.final(),
  ]);
  return plaintext.toString('utf8');
}
