export function formatBRL(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

/** Remove tudo que não é dígito. Base pra normalização de documento (CPF/CNPJ). */
export function onlyDigits(value: string): string {
  return value.replace(/\D+/g, '');
}

/**
 * Valida CPF (11 díg) ou CNPJ (14 díg) por dígitos verificadores. Aceita com ou
 * sem máscara. Usado pra coletar o documento do pagador no chat (Asaas exige).
 * Espelha `isValidCpfCnpj` de apps/web/src/lib/format.ts.
 */
export function isValidCpfCnpj(value: string): boolean {
  const digits = onlyDigits(value);
  if (digits.length === 11) return isValidCpf(digits);
  if (digits.length === 14) return isValidCnpj(digits);
  return false;
}

function isValidCpf(cpf: string): boolean {
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i], 10) * (10 - i);
  let check = (sum * 10) % 11;
  if (check === 10) check = 0;
  if (check !== parseInt(cpf[9], 10)) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i], 10) * (11 - i);
  check = (sum * 10) % 11;
  if (check === 10) check = 0;
  return check === parseInt(cpf[10], 10);
}

function isValidCnpj(cnpj: string): boolean {
  if (/^(\d)\1{13}$/.test(cnpj)) return false;
  const calc = (len: number) => {
    let pos = len - 7;
    let sum = 0;
    for (let i = len; i >= 1; i--) {
      sum += parseInt(cnpj[len - i], 10) * pos--;
      if (pos < 2) pos = 9;
    }
    return sum % 11 < 2 ? 0 : 11 - (sum % 11);
  };
  if (calc(12) !== parseInt(cnpj[12], 10)) return false;
  return calc(13) === parseInt(cnpj[13], 10);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${m}min`;
}

// Formata um telefone E.164 brasileiro (ex.: "5511912345678") para exibição
// humana: "(11) 91234-5678". Aceita celular (13 díg) e fixo (12 díg). Se não
// reconhecer o formato, retorna o valor original sem alterar.
export function formatPhoneBR(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  const national = digits.startsWith('55') ? digits.slice(2) : digits;
  const ddd = national.slice(0, 2);
  const rest = national.slice(2);
  if (rest.length === 9) return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
  if (rest.length === 8) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  return phone;
}
