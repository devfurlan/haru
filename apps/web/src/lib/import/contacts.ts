// Spec de importação de CLIENTES (Contact). resolveContact é PURO (normaliza/valida/decide
// disposição contra o conjunto de telefones já existentes) e testável; applyContacts busca
// esse conjunto uma vez e, se não for dryRun, faz o upsert por (tenantId, phone).

import { prisma } from '@haru/database';
import { isValidCpfCnpj, normalizePhoneBR, onlyDigits } from '@haru/shared';

import {
  type ApplyResult,
  cell,
  type Mapping,
  parseImportDate,
  type Row,
  type RowResult,
} from './mapping';

interface TenantCtx {
  id: string;
  timezone: string;
}

// E.164 BR: 55 + DDD(2) + número(8 ou 9). Mesmo formato canônico do banco.
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

/** Puro. `existingPhones` é mutado (adiciona o telefone) pra deduplicar dentro do lote. */
export function resolveContact(
  input: ContactInput,
  existingPhones: Set<string>,
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

  const disposition = phone && existingPhones.has(phone) ? 'update' : 'create';
  if (phone) existingPhones.add(phone);
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

export async function applyContacts(
  tenant: TenantCtx,
  rows: Row[],
  mapping: Mapping,
  dryRun: boolean,
): Promise<ApplyResult> {
  const existing = await prisma.contact.findMany({
    where: { tenantId: tenant.id, phone: { not: null } },
    select: { phone: true },
  });
  const existingPhones = new Set(existing.map((c) => c.phone as string));

  const counts = { create: 0, update: 0, skip: 0, error: 0 };
  const results: RowResult[] = [];
  for (const row of rows) {
    const r = resolveContact(readContact(row, mapping), existingPhones);
    if (r.disposition === 'error' || !r.write) {
      counts.error++;
      results.push({ disposition: 'error', error: r.error });
      continue;
    }
    if (!dryRun) {
      try {
        await writeContact(tenant.id, r.write);
      } catch {
        counts.error++;
        results.push({ disposition: 'error', error: 'Falha ao gravar' });
        continue;
      }
    }
    counts[r.disposition]++;
    results.push({ disposition: r.disposition });
  }
  return { counts, rows: results };
}

async function writeContact(tenantId: string, w: ContactWrite): Promise<void> {
  if (w.phone) {
    // update só sobrescreve o que veio preenchido - não zera name/email já cadastrados.
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
    // Sem telefone não há como deduplicar (múltiplos NULL são distintos no Postgres): cria sempre.
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
