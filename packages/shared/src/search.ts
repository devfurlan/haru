// Busca textual tolerante, compartilhada por todos os apps (diretório do app, bot de
// suporte, painel admin, lista de clientes). Puro: sem acento, minúsculo, símbolos viram
// espaço, casa por token. Roda igual em qualquer runtime.

// "STLima-Barber", "St. Lima" e "São João" viram "stlima barber", "st lima", "sao joao".
// ̀-ͯ = marcas de acento combinantes que o NFD separou da letra base.
export function normalizeForSearch(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Casa se TODO token (>= 2 chars) do termo aparece no texto normalizado das partes juntas
// (ex.: nome + slug). Ordem das palavras livre. Incluir o slug resolve "st lima" -> slug
// "stlima-barber": "st" e "lima" existem em "stlima". Tokens de 1 char são ruído (casam
// quase todo nome) e caem fora; se não sobrar token (termo só de símbolos/emoji/letras
// soltas), NÃO casa nada - listar tudo é decisão do caller, que nem chama esta função.
export function matchesSearch(query: string, ...parts: (string | null | undefined)[]): boolean {
  const tokens = normalizeForSearch(query)
    .split(' ')
    .filter((t) => t.length >= 2);
  if (tokens.length === 0) return false;
  const haystack = parts.map((p) => normalizeForSearch(p ?? '')).join(' ');
  return tokens.every((t) => haystack.includes(t));
}
