// Núcleo PURO da importação (zero Prisma/Next/SheetJS): campos-alvo de cada entidade,
// palpite de de-para coluna->campo, detecção de qual entidade é uma aba/planilha pelo
// cabeçalho, e parsers de valor (preço BR, duração, datas). Puro pra ser testável com tsx.

export type EntityId = 'contacts' | 'services' | 'appointments' | 'history';

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
export interface Counts {
  create: number;
  update: number;
  skip: number;
  error: number;
}

/** Um par possivelmente duplicado (clientes), surgido do mesmo telefone. */
export interface DuplicatePair {
  /** Chave estável do par (telefone normalizado). */
  id: string;
  reason: string;
  /** Lado esquerdo: contato já existente OU a 1ª linha do arquivo. */
  leftTag: string;
  leftName: string;
  leftMeta: string;
  /** Lado direito: sempre uma linha do arquivo. */
  rightTag: string;
  rightName: string;
  rightMeta: string;
  /** 'existing' = existente x arquivo; 'internal' = duas linhas do arquivo. */
  kind: 'existing' | 'internal';
}

/** Um conflito de agenda: um agendamento do arquivo bate com um já existente. */
export interface ScheduleConflict {
  id: string;
  when: string;
  incomingLabel: string;
  incomingMeta: string;
  existingLabel: string;
  existingMeta: string;
}

/** Escolhas do usuário na tela de revisão, por chave de par/conflito. */
export interface Resolutions {
  /** telefone -> escolha. Ausente = 'merge' (default). */
  duplicates?: Record<string, 'merge' | 'ignore'>;
  /** id do conflito -> escolha. Ausente = 'skip' (default). */
  conflicts?: Record<string, 'skip' | 'import'>;
}

/** Resultado de uma passada (analyze = dryRun rico; commit = já gravado). */
export interface AnalyzeResult {
  counts: Counts;
  errors: { row: number; error: string }[];
  pairs: DuplicatePair[];
  conflicts: ScheduleConflict[];
}

export interface FieldDef {
  id: string;
  label: string;
  hint?: string;
}

// Campos-alvo por entidade. Ordem = exibição e prioridade no match (específico primeiro).
export const ENTITY_FIELDS: Record<EntityId, FieldDef[]> = {
  contacts: [
    { id: 'phone', label: 'Telefone (WhatsApp)', hint: 'chave de deduplicação' },
    { id: 'name', label: 'Nome' },
    { id: 'email', label: 'E-mail' },
    { id: 'document', label: 'CPF' },
    { id: 'birthDate', label: 'Data de nascimento' },
  ],
  services: [
    { id: 'name', label: 'Nome do serviço' },
    { id: 'durationMinutes', label: 'Duração' },
    { id: 'price', label: 'Preço' },
    { id: 'description', label: 'Descrição' },
  ],
  appointments: [
    { id: 'serviceName', label: 'Serviço' },
    { id: 'professionalName', label: 'Profissional' },
    { id: 'customerPhone', label: 'Telefone do cliente' },
    { id: 'customerName', label: 'Cliente' },
    { id: 'date', label: 'Data' },
    { id: 'time', label: 'Horário' },
    { id: 'status', label: 'Status' },
  ],
  history: [
    { id: 'serviceName', label: 'Serviço' },
    { id: 'professionalName', label: 'Profissional' },
    { id: 'customerPhone', label: 'Telefone do cliente' },
    { id: 'customerName', label: 'Cliente' },
    { id: 'date', label: 'Data do atendimento' },
    { id: 'time', label: 'Horário' },
    { id: 'value', label: 'Valor pago' },
  ],
};

export const ENTITY_LABEL: Record<EntityId, string> = {
  contacts: 'Clientes',
  services: 'Serviços',
  appointments: 'Agendamentos',
  history: 'Histórico',
};

/** Ordem canônica de commit: serviços antes (agendamentos referenciam), depois clientes,
 *  depois a agenda futura, por fim o histórico. */
export const ENTITY_ORDER: EntityId[] = ['services', 'contacts', 'appointments', 'history'];

// Sinônimos por campo (substrings do cabeçalho normalizado). Sinônimo mais longo ganha.
const SYNONYMS: Record<string, string[]> = {
  phone: ['whatsapp', 'telefone', 'celular', 'contato', 'fone', 'phone', 'tel'],
  name: ['nomecompleto', 'nomedocliente', 'cliente', 'nome', 'name', 'paciente'],
  email: ['email', 'mail'],
  document: ['cpfcnpj', 'documento', 'cpf', 'doc'],
  birthDate: ['datadenascimento', 'nascimento', 'aniversario', 'dtnasc', 'birth'],
  durationMinutes: ['duracao', 'duration', 'tempo', 'minutos', 'min'],
  price: ['preco', 'valor', 'price', 'rs'],
  description: ['descricao', 'description', 'observacao', 'obs'],
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
  value: ['valorpago', 'valor', 'total', 'pago', 'preco'],
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

/** Adivinha o de-para (campo -> cabeçalho). Cada cabeçalho vai pra no máximo um campo. */
export function guessMapping(headers: string[], entity: EntityId): Mapping {
  const norm = headers.map((h) => ({ raw: h, n: normalizeHeader(h) }));
  const used = new Set<string>();
  const mapping: Mapping = {};
  for (const field of ENTITY_FIELDS[entity]) {
    const synonyms = SYNONYMS[field.id] ?? [];
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

/**
 * Adivinha QUAL entidade é uma tabela (aba/planilha) pelo cabeçalho. Regras em ordem:
 * serviços (tem duração/preço, sem data) > histórico (data + valor pago) > agendamentos
 * (data + cliente + serviço) > clientes (telefone/nome). Default: clientes.
 * ponytail: heurística - se errar, o usuário troca a aba no passo de conferência.
 */
export function detectEntity(headers: string[]): EntityId {
  const norm = headers.map(normalizeHeader);
  const has = (syns: string[]) => norm.some((h) => syns.some((s) => h.includes(s)));
  const hasDate = has(SYNONYMS.date);
  const hasCustomer = has(['cliente', 'paciente']) || has(SYNONYMS.phone);
  const hasService = has(SYNONYMS.serviceName);
  const hasDuration = has(SYNONYMS.durationMinutes);
  const hasPrice = has(['preco', 'valor', 'price']);
  const hasPago = norm.some((h) => h.includes('pago'));

  if ((hasDuration || hasPrice) && hasService && !hasDate) return 'services';
  if (hasDate && hasCustomer && (hasPago || (hasPrice && !has(SYNONYMS.professionalName))))
    return 'history';
  if (hasDate && hasCustomer && hasService) return 'appointments';
  return 'contacts';
}

/** Valor de um campo numa linha, conforme o de-para. '' se não mapeado ou vazio. */
export function cell(row: Row, mapping: Mapping, fieldId: string): string {
  const header = mapping[fieldId];
  if (!header) return '';
  return (row[header] ?? '').trim();
}

// ─── Parsers de valor (puros) ──────────────────────────────────────────────────────

/** Preço BR/US -> centavos. Vírgula = decimal (ponto = milhar); sem vírgula, ponto = decimal. */
export function parsePriceToCents(raw: string): number | null {
  const cleaned = raw.replace(/[^\d.,-]/g, '');
  if (!cleaned) return null;
  const normalized = cleaned.includes(',') ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned;
  const n = Number(normalized);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

/** Duração -> minutos. "30", "30 min", "1h", "1h30", "01:30". null se não achar. */
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
 * Data (+ hora opcional) -> { dateStr 'YYYY-MM-DD', minutes } em HORA LOCAL (o fuso é
 * aplicado no spec). "dd/mm/yyyy", "dd/mm/yy", "yyyy-mm-dd", hora junto ou separada.
 * BR: assume dd/mm. null se irreconhecível.
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
