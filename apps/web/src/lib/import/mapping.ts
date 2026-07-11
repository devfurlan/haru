// Núcleo PURO da importação (zero Prisma/Next/SheetJS): define os campos-alvo de cada
// entidade, adivinha o de-para coluna->campo a partir do cabeçalho e parseia os valores
// crus (preço BR, duração, datas). Reusado pelos specs, pelos route handlers e pelo
// self-check. Mantém-se puro pra ser testável com `tsx` sem subir banco.

export type EntityId = 'contacts' | 'services' | 'appointments';
export type SourceId = 'appbarber' | 'trinks' | 'generic';

/** Uma linha crua da planilha: cabeçalho -> valor (tudo string, já trimado). */
export type Row = Record<string, string>;
/** De-para confirmado: id do campo-alvo -> cabeçalho de origem (null = não importar). */
export type Mapping = Record<string, string | null>;

/** O que acontece (ou aconteceria, em dryRun) com uma linha. */
export type Disposition = 'create' | 'update' | 'skip' | 'error';
export interface RowResult {
  disposition: Disposition;
  error?: string;
}
export interface ApplyResult {
  counts: { create: number; update: number; skip: number; error: number };
  rows: RowResult[];
}

export interface FieldDef {
  id: string;
  label: string;
  /** Dica curta exibida abaixo do label no passo de mapeamento. */
  hint?: string;
}

// Campos-alvo por entidade (ordem = ordem de exibição e de prioridade no match: os mais
// específicos primeiro pra "fisgarem" o cabeçalho antes dos genéricos).
export const ENTITY_FIELDS: Record<EntityId, FieldDef[]> = {
  contacts: [
    { id: 'phone', label: 'Telefone / WhatsApp', hint: 'chave de deduplicação' },
    { id: 'name', label: 'Nome' },
    { id: 'email', label: 'E-mail' },
    { id: 'document', label: 'CPF' },
    { id: 'birthDate', label: 'Nascimento' },
  ],
  services: [
    { id: 'name', label: 'Nome do serviço' },
    { id: 'durationMinutes', label: 'Duração (min)' },
    { id: 'price', label: 'Preço' },
    { id: 'description', label: 'Descrição' },
  ],
  appointments: [
    { id: 'serviceName', label: 'Serviço' },
    { id: 'professionalName', label: 'Profissional' },
    { id: 'customerPhone', label: 'Telefone do cliente' },
    { id: 'date', label: 'Data' },
    { id: 'time', label: 'Hora' },
    { id: 'status', label: 'Status' },
    { id: 'customerName', label: 'Nome do cliente' },
  ],
};

export const ENTITY_LABEL: Record<EntityId, string> = {
  contacts: 'Clientes',
  services: 'Serviços',
  appointments: 'Agendamentos',
};

export const SOURCE_LABEL: Record<SourceId, string> = {
  appbarber: 'AppBarber',
  trinks: 'Trinks',
  generic: 'Planilha',
};

// Sinônimos genéricos por campo (substrings do cabeçalho normalizado). É o "preset"
// da planilha genérica e a base pra AppBarber/Trinks. Um sinônimo mais longo ganha do
// mais curto no desempate (ex.: "telefone" > "tel").
const SYNONYMS: Record<string, string[]> = {
  // contacts
  phone: ['whatsapp', 'telefone', 'celular', 'contato', 'fone', 'phone', 'tel'],
  name: ['nomecompleto', 'nomedocliente', 'cliente', 'nome', 'name', 'paciente'],
  email: ['email', 'mail'],
  document: ['cpfcnpj', 'documento', 'cpf', 'doc'],
  birthDate: ['datadenascimento', 'nascimento', 'aniversario', 'dtnasc', 'birth'],
  // services
  durationMinutes: ['duracao', 'duration', 'tempo', 'minutos', 'min'],
  price: ['preco', 'valor', 'price', 'rs'],
  description: ['descricao', 'description', 'observacao', 'obs'],
  // appointments
  serviceName: ['servicos', 'servico', 'service', 'procedimento'],
  professionalName: [
    'profissional',
    'colaborador',
    'funcionario',
    'atendente',
    'professional',
    'barbeiro',
    'cabeleireiro',
  ],
  customerPhone: ['telefonecliente', 'whatsapp', 'telefone', 'celular', 'contato', 'fone'],
  customerName: ['nomecliente', 'cliente', 'nome', 'paciente'],
  date: ['datahora', 'agendamento', 'data', 'inicio', 'dia', 'date'],
  time: ['horario', 'hora', 'time'],
  status: ['situacao', 'status', 'estado'],
};

// Presets por origem: sinônimos EXTRA específicos do export de cada sistema. Vazio hoje
// porque o match genérico já cobre os cabeçalhos PT-BR comuns e o ajuste manual é a rede
// de segurança.
// ponytail: palpite - calibrar contra um export real de AppBarber/Trinks e adicionar aqui
// os cabeçalhos exatos que o genérico não pegar (ex.: 'nomefantasia', abreviações).
const SOURCE_PRESETS: Record<SourceId, Record<string, string[]>> = {
  appbarber: {},
  trinks: {},
  generic: {},
};

/** minúsculo, sem acento, só alfanumérico: "Telefone / Celular" -> "telefonecelular". */
export function normalizeHeader(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function matchScore(normHeader: string, synonyms: string[]): number {
  let best = 0;
  for (const s of synonyms) {
    if (normHeader === s) best = Math.max(best, 100);
    else if (normHeader.includes(s)) best = Math.max(best, s.length);
  }
  return best;
}

/**
 * Adivinha o de-para (campo-alvo -> cabeçalho) por match de sinônimos. Cada cabeçalho é
 * usado por no máximo um campo (o de maior score). Campo sem match vira null.
 */
export function guessMapping(headers: string[], entity: EntityId, source: SourceId): Mapping {
  const syn = SOURCE_PRESETS[source];
  const norm = headers.map((h) => ({ raw: h, n: normalizeHeader(h) }));
  const used = new Set<string>();
  const mapping: Mapping = {};
  for (const field of ENTITY_FIELDS[entity]) {
    const synonyms = [...(syn[field.id] ?? []), ...(SYNONYMS[field.id] ?? [])];
    let bestHeader: string | null = null;
    let bestScore = 0;
    for (const h of norm) {
      if (used.has(h.raw)) continue;
      const score = matchScore(h.n, synonyms);
      if (score > bestScore) {
        bestScore = score;
        bestHeader = h.raw;
      }
    }
    if (bestHeader) used.add(bestHeader);
    mapping[field.id] = bestHeader;
  }
  return mapping;
}

/** Valor de um campo numa linha, conforme o de-para. '' se não mapeado ou vazio. */
export function cell(row: Row, mapping: Mapping, fieldId: string): string {
  const header = mapping[fieldId];
  if (!header) return '';
  return (row[header] ?? '').trim();
}

// ─── Parsers de valor (puros) ──────────────────────────────────────────────────────

/**
 * Preço BR/US -> centavos. Se há vírgula, ela é o decimal e o ponto é milhar
 * ("1.234,56" -> 123456). Sem vírgula, o ponto é decimal ("50.00" -> 5000). null se não
 * for número >= 0.
 */
export function parsePriceToCents(raw: string): number | null {
  const cleaned = raw.replace(/[^\d.,-]/g, '');
  if (!cleaned) return null;
  const normalized = cleaned.includes(',') ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned;
  const n = Number(normalized);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

/** Duração -> minutos. Aceita "30", "30 min", "1h", "1h30", "01:30". null se não achar. */
export function parseDurationMin(raw: string): number | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  const hm = s.match(/^(\d{1,2}):(\d{2})/);
  if (hm) return Number(hm[1]) * 60 + Number(hm[2]);
  const h = s.match(/(\d+)\s*h\s*(\d+)?/);
  if (h) return Number(h[1]) * 60 + (h[2] ? Number(h[2]) : 0);
  const m = s.match(/\d+/);
  return m ? Number(m[0]) : null;
}

/**
 * Data (+ hora opcional) de planilha -> { dateStr 'YYYY-MM-DD', minutes desde meia-noite }
 * em HORA LOCAL (o fuso é aplicado depois, no spec, via localWallTimeToUtc). Aceita
 * "dd/mm/yyyy", "dd/mm/yy", "yyyy-mm-dd", com hora " HH:mm" junto ou em `timeRaw`
 * separado. Sem hora -> meia-noite. BR: assume dd/mm (não mm/dd). null se irreconhecível.
 * ponytail: cobre os formatos comuns; formato exótico (ex.: "jun/26") cai como erro na
 * prévia - o dono vê e corrige a planilha.
 */
export function parseImportDate(
  dateRaw: string,
  timeRaw?: string,
): { dateStr: string; minutes: number } | null {
  const d = dateRaw.trim();
  if (!d) return null;
  let y: number, mo: number, day: number;
  const iso = d.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  const br = d.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (iso) {
    y = Number(iso[1]);
    mo = Number(iso[2]);
    day = Number(iso[3]);
  } else if (br) {
    day = Number(br[1]);
    mo = Number(br[2]);
    y = Number(br[3]);
    if (y < 100) y += 2000;
  } else {
    return null;
  }
  if (mo < 1 || mo > 12 || day < 1 || day > 31) return null;
  let hh = 0;
  let mi = 0;
  const tm = (timeRaw?.trim() || d).match(/(\d{1,2}):(\d{2})/);
  if (tm) {
    hh = Number(tm[1]);
    mi = Number(tm[2]);
    if (hh > 23 || mi > 59) return null;
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return { dateStr: `${y}-${pad(mo)}-${pad(day)}`, minutes: hh * 60 + mi };
}
