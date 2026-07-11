// Spec de CLIENTES (Contact). Além de normalizar/validar/deduplicar por telefone, o
// analyze detecta PARES possivelmente duplicados (mesmo telefone, nome diferente): entre
// um contato já existente e a planilha, ou entre duas linhas da planilha. No commit, o
// usuário pode 'ignorar' o telefone (pula) ou 'mesclar' (default = upsert, atualiza o
// existente). Como (tenantId, phone) é único, não existe "manter os dois" pra mesmo
// telefone - as opções reais são mesclar ou ignorar.

import { prisma } from '@haru/database';
import { formatPhoneBR, isValidCpfCnpj, normalizePhoneBR, onlyDigits } from '@haru/shared';

import {
  type AnalyzeResult,
  cell,
  type DuplicatePair,
  type Mapping,
  parseImportDate,
  type Resolutions,
  type Row,
  type RowResult,
} from './mapping';

interface TenantCtx {
  id: string;
  timezone: string;
}

const VALID_PHONE = /^55\d{10,11}$/;

export interface ContactInput {
  phone: string;
  name: string;
  email: string;
  document: string;
  birthDate: string;
}
export interface ContactWrite {
  phone: string | null;
  name: string | null;
  email: string | null;
  document: string | null;
  birthDate: Date | null;
}

/** Puro. `seenPhones` é mutado (decide create/update e dedup dentro do lote). */
export function resolveContact(
  input: ContactInput,
  seenPhones: Set<string>,
): RowResult & { write?: ContactWrite } {
  let phone: string | null = null;
  if (input.phone) {
    const p = normalizePhoneBR(input.phone);
    if (!VALID_PHONE.test(p))
      return { disposition: 'error', error: `Telefone inválido: "${input.phone}"` };
    phone = p;
  }

  const name = input.name || null;
  if (!phone && !name) return { disposition: 'error', error: 'Linha sem telefone nem nome' };

  let document: string | null = null;
  if (input.document) {
    const d = onlyDigits(input.document);
    if (!isValidCpfCnpj(d))
      return { disposition: 'error', error: `CPF inválido: "${input.document}"` };
    document = d;
  }

  let birthDate: Date | null = null;
  if (input.birthDate) {
    const parsed = parseImportDate(input.birthDate);
    if (!parsed)
      return { disposition: 'error', error: `Nascimento inválido: "${input.birthDate}"` };
    birthDate = new Date(`${parsed.dateStr}T00:00:00.000Z`);
  }

  const disposition = phone && seenPhones.has(phone) ? 'update' : 'create';
  if (phone) seenPhones.add(phone);
  return { disposition, write: { phone, name, email: input.email || null, document, birthDate } };
}

function readContact(row: Row, m: Mapping): ContactInput {
  return {
    phone: cell(row, m, 'phone'),
    name: cell(row, m, 'name'),
    email: cell(row, m, 'email'),
    document: cell(row, m, 'document'),
    birthDate: cell(row, m, 'birthDate'),
  };
}

async function runContacts(
  tenant: TenantCtx,
  rows: Row[],
  mapping: Mapping,
  commit: boolean,
  resolutions?: Resolutions,
): Promise<AnalyzeResult> {
  const existing = await prisma.contact.findMany({
    where: { tenantId: tenant.id, phone: { not: null } },
    select: { phone: true, name: true },
  });
  const existingNameByPhone = new Map<string, string | null>();
  for (const c of existing) if (c.phone) existingNameByPhone.set(c.phone, c.name);
  const existingPhones = new Set(existingNameByPhone.keys());

  const ignored = new Set(
    Object.entries(resolutions?.duplicates ?? {})
      .filter(([, v]) => v === 'ignore')
      .map(([k]) => k),
  );

  const seenPhones = new Set(existingPhones);
  const incomingByPhone = new Map<string, { row: number; name: string }[]>();
  const counts = { create: 0, update: 0, skip: 0, error: 0 };
  const errors: { row: number; error: string }[] = [];

  let rowNum = 1;
  for (const row of rows) {
    rowNum++;
    const r = resolveContact(readContact(row, mapping), seenPhones);
    if (r.disposition === 'error' || !r.write) {
      counts.error++;
      if (errors.length < 200) errors.push({ row: rowNum, error: r.error ?? 'erro' });
      continue;
    }
    if (r.write.phone) {
      const list = incomingByPhone.get(r.write.phone);
      if (list) list.push({ row: rowNum, name: r.write.name ?? '' });
      else incomingByPhone.set(r.write.phone, [{ row: rowNum, name: r.write.name ?? '' }]);
    }
    if (commit && r.write.phone && ignored.has(r.write.phone)) {
      counts.skip++;
      continue;
    }
    if (commit) {
      try {
        await writeContact(tenant.id, r.write);
      } catch {
        counts.error++;
        if (errors.length < 200) errors.push({ row: rowNum, error: 'Falha ao gravar' });
        continue;
      }
    }
    counts[r.disposition]++;
  }

  const pairs = commit ? [] : detectPairs(incomingByPhone, existingNameByPhone);
  return { counts, errors, pairs, conflicts: [] };
}

/** Um par por telefone: existente x planilha (nome diferente) ou planilha x planilha. */
function detectPairs(
  incomingByPhone: Map<string, { row: number; name: string }[]>,
  existingNameByPhone: Map<string, string | null>,
): DuplicatePair[] {
  const pairs: DuplicatePair[] = [];
  const norm = (s: string) => s.trim().toLowerCase();
  for (const [phone, list] of incomingByPhone) {
    if (pairs.length >= 50) break;
    const meta = formatPhoneBR(phone);
    const existingName = existingNameByPhone.get(phone);
    if (
      existingName != null &&
      list[0] &&
      norm(existingName) !== norm(list[0].name) &&
      list[0].name
    ) {
      pairs.push({
        id: phone,
        kind: 'existing',
        reason: 'Mesmo telefone, nome escrito diferente. Provavelmente a mesma pessoa.',
        leftTag: 'Já no Demandaê',
        leftName: existingName,
        leftMeta: meta,
        rightTag: `Na planilha · linha ${list[0].row}`,
        rightName: list[0].name,
        rightMeta: meta,
      });
      continue;
    }
    if (list.length >= 2 && norm(list[0].name) !== norm(list[1].name)) {
      pairs.push({
        id: phone,
        kind: 'internal',
        reason: `Duas linhas na planilha com o mesmo telefone (linhas ${list[0].row} e ${list[1].row}).`,
        leftTag: `Planilha · linha ${list[0].row}`,
        leftName: list[0].name || '(sem nome)',
        leftMeta: meta,
        rightTag: `Planilha · linha ${list[1].row}`,
        rightName: list[1].name || '(sem nome)',
        rightMeta: meta,
      });
    }
  }
  return pairs;
}

export const analyzeContacts = (t: TenantCtx, r: Row[], m: Mapping) => runContacts(t, r, m, false);
export const commitContacts = (t: TenantCtx, r: Row[], m: Mapping, res?: Resolutions) =>
  runContacts(t, r, m, true, res);

async function writeContact(tenantId: string, w: ContactWrite): Promise<void> {
  if (w.phone) {
    const update: Record<string, unknown> = {};
    if (w.name) update.name = w.name;
    if (w.email) update.email = w.email;
    if (w.document) update.document = w.document;
    if (w.birthDate) update.birthDate = w.birthDate;
    await prisma.contact.upsert({
      where: { tenantId_phone: { tenantId, phone: w.phone } },
      update,
      create: {
        tenantId,
        phone: w.phone,
        name: w.name,
        email: w.email,
        document: w.document,
        birthDate: w.birthDate,
      },
    });
  } else {
    await prisma.contact.create({
      data: {
        tenantId,
        name: w.name,
        email: w.email,
        document: w.document,
        birthDate: w.birthDate,
      },
    });
  }
}
