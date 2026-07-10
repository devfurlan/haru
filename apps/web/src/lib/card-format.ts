/**
 * Máscaras e gating do form de cartão da tela "Trocar forma de pagamento". Funções PURAS
 * (sem React / sem 'use client') pra o dialog client importar E o self-check em node rodar.
 * NADA aqui persiste ou envia o cartão - só formata a digitação e diz se o CTA pode acender.
 */

/** Só dígitos, cortando no limite. */
function digits(v: string, max: number): string {
  return v.replace(/\D/g, '').slice(0, max);
}

/** "4242424242424242" → "4242 4242 4242 4242" (até 19 dígitos, grupos de 4). */
export function maskCardNumber(v: string): string {
  return (digits(v, 19).match(/.{1,4}/g) ?? []).join(' ');
}

/** "1228" → "12/28". Trava o mês em 2 dígitos antes da barra. */
export function maskExpiry(v: string): string {
  const d = digits(v, 4);
  return d.length <= 2 ? d : `${d.slice(0, 2)}/${d.slice(2)}`;
}

/** CVV: 3-4 dígitos. */
export function maskCvv(v: string): string {
  return digits(v, 4);
}

/** "13458000" → "13458-000". */
export function maskCep(v: string): string {
  const d = digits(v, 8);
  return d.length <= 5 ? d : `${d.slice(0, 5)}-${d.slice(5)}`;
}

/** Últimos 4 dígitos do que foi digitado (fallback local; a fonte real é o Asaas). */
export function cardLast4(v: string): string {
  return v.replace(/\D/g, '').slice(-4);
}

/** Validade "MM/AA" bem-formada e com mês 01-12 (não checa expiração - o Asaas recusa). */
export function isExpiryValid(exp: string): boolean {
  const m = /^(\d{2})\/(\d{2})$/.exec(exp.trim());
  if (!m) return false;
  const month = Number(m[1]);
  return month >= 1 && month <= 12;
}

export interface CardForm {
  number: string;
  exp: string;
  cvv: string;
  name: string;
  cpfCnpj: string;
  cep: string;
  addressNumber: string;
}

/**
 * CTA só acende quando TODOS os campos exigidos pela tokenização do Asaas estão completos.
 * Comprimentos batem com o que o Asaas aceita (nº 13-19, CVV 3-4, CPF 11 / CNPJ 14, CEP 8).
 */
export function isCardComplete(f: CardForm): boolean {
  const num = f.number.replace(/\D/g, '');
  const cvv = f.cvv.replace(/\D/g, '');
  const doc = f.cpfCnpj.replace(/\D/g, '');
  const cep = f.cep.replace(/\D/g, '');
  return (
    num.length >= 13 &&
    num.length <= 19 &&
    isExpiryValid(f.exp) &&
    cvv.length >= 3 &&
    cvv.length <= 4 &&
    f.name.trim().length >= 2 &&
    (doc.length === 11 || doc.length === 14) &&
    cep.length === 8 &&
    f.addressNumber.trim().length >= 1
  );
}
