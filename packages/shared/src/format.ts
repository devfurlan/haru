const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export function formatBRL(cents: number): string {
  return brl.format(cents / 100);
}

const brlShort = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * R$ arredondado, sem centavos ("R$ 3.240"). Padrão dos números grandes que o DONO lê
 * (painel, relatório semanal) - centavos só viram ruído em faturamento/receita.
 */
export function formatBRLShort(cents: number): string {
  return brlShort.format(Math.round(cents / 100));
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

export function minutesToHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Formata uma string de dígitos como moeda BRL para uso em input (ex.: "5000" -> "50,00").
// Trata o valor como centavos: o usuário digita da direita pra esquerda.
export function maskBRLInput(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  const cents = Number(digits);
  const reais = Math.floor(cents / 100);
  const centavos = String(cents % 100).padStart(2, '0');
  return `${reais.toLocaleString('pt-BR')},${centavos}`;
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

// Normaliza um telefone BR pra E.164 sem máscara (ex.: "5511912345678") - formato
// canônico do banco (o mesmo que o bot grava). Aceita entrada com máscara, com ou
// sem DDI 55. Determinística: só prefixa o DDI quando a parte nacional tem 10 (fixo)
// ou 11 (celular) dígitos e a entrada ainda não traz o 55 - evita DDI duplicado
// ("5555…"). Entrada irreconhecível volta como veio, pra validação a jusante recusar.
export function normalizePhoneBR(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (/^55\d{10,11}$/.test(digits)) return digits;
  if (/^\d{10,11}$/.test(digits)) return `55${digits}`;
  return digits;
}

// Mascara o que o usuário digita num input de telefone BR, progressivamente:
// "11"        -> "(11"
// "1191234"   -> "(11) 91234"
// "11912345678" -> "(11) 91234-5678"
// Aceita celular (11 díg nacionais) e fixo (10). Ignora DDI 55 inicial pra não
// duplicar quando o valor vem do banco em E.164. O server action normaliza
// depois via normalizePhoneBR, então enviar o valor mascarado é seguro.
export function maskPhoneBRInput(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length > 11) digits = digits.slice(2);
  digits = digits.slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);
  // 9 dígitos = celular (5+4); 8 = fixo (4+4); enquanto digita, quebra em 5+4.
  const split = rest.length > 8 ? 5 : 4;
  if (rest.length <= split) return `(${ddd}) ${rest}`;
  return `(${ddd}) ${rest.slice(0, split)}-${rest.slice(split)}`;
}

// Só os dígitos de um CPF/CNPJ (ex.: "123.456.789-09" -> "12345678909"). Formato
// canônico pra guardar no banco e enviar ao gateway.
export function onlyDigits(raw: string): string {
  return raw.replace(/\D/g, '');
}

// Mascara progressivamente o que o usuário digita num input de CPF/CNPJ:
// até 11 dígitos formata como CPF ("123.456.789-09"); acima, como CNPJ
// ("12.345.678/0001-90"). Não valida - só formata o que tem.
export function maskCpfCnpjInput(raw: string): string {
  const digits = onlyDigits(raw).slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
  }
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3/$4')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, '$1.$2.$3/$4-$5');
}

// Valida CPF (11 díg) pelos dígitos verificadores. Recusa sequências repetidas
// ("111.111.111-11") que passariam no cálculo mas são inválidas.
function isValidCpf(digits: string): boolean {
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(digits[i]) * (len + 1 - i);
    const mod = (sum * 10) % 11;
    return mod === 10 ? 0 : mod;
  };
  return calc(9) === Number(digits[9]) && calc(10) === Number(digits[10]);
}

// Valida CNPJ (14 díg) pelos dígitos verificadores. Recusa sequências repetidas.
function isValidCnpj(digits: string): boolean {
  if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) return false;
  const calc = (len: number) => {
    const weights =
      len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(digits[i]) * weights[i];
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };
  return calc(12) === Number(digits[12]) && calc(13) === Number(digits[13]);
}

// Valida um CPF (11 díg) ou CNPJ (14 díg) a partir de qualquer entrada (com ou
// sem máscara). É a checagem usada antes de mandar o documento ao gateway.
export function isValidCpfCnpj(raw: string): boolean {
  const digits = onlyDigits(raw);
  if (digits.length === 11) return isValidCpf(digits);
  if (digits.length === 14) return isValidCnpj(digits);
  return false;
}

// Formata uma data sem hora (ex.: data de nascimento). A data é guardada como
// meia-noite UTC; usamos timeZone 'UTC' pra não recuar um dia no fuso local.
export function formatDateOnly(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'UTC',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function hhmmToMinutes(hhmm: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}
