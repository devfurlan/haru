// Spec de SERVIÇOS. resolveService é puro (testável); runServices busca os serviços
// existentes (dedup por nome) e os profissionais uma vez, e no commit grava (serviço novo
// vinculado a todos os profissionais, senão some do booking). Não tem par/conflito.

import { prisma } from '@haru/database';

import {
  type AnalyzeResult,
  cell,
  type Mapping,
  parseDurationMin,
  parsePriceToCents,
  type Row,
  type RowResult,
} from './mapping';

interface TenantCtx {
  id: string;
  timezone: string;
}

export interface ServiceInput {
  name: string;
  durationMinutes: string;
  price: string;
  description: string;
}
export interface ServiceWrite {
  name: string;
  durationMinutes: number;
  priceCents: number;
  description: string | null;
}

/** Puro. `existingNames` (minúsculo) é mutado pra deduplicar dentro do lote. */
export function resolveService(
  input: ServiceInput,
  existingNames: Set<string>,
): RowResult & { write?: ServiceWrite } {
  const name = input.name.trim();
  if (!name) return { disposition: 'error', error: 'Serviço sem nome' };

  const durationMinutes = parseDurationMin(input.durationMinutes);
  if (durationMinutes == null || durationMinutes < 1 || durationMinutes > 480) {
    return { disposition: 'error', error: `Duração inválida: "${input.durationMinutes}"` };
  }

  let priceCents = 0;
  if (input.price) {
    const p = parsePriceToCents(input.price);
    if (p == null) return { disposition: 'error', error: `Preço inválido: "${input.price}"` };
    priceCents = p;
  }

  const key = name.toLowerCase();
  const disposition = existingNames.has(key) ? 'update' : 'create';
  existingNames.add(key);
  return {
    disposition,
    write: { name, durationMinutes, priceCents, description: input.description || null },
  };
}

function readService(row: Row, m: Mapping): ServiceInput {
  return {
    name: cell(row, m, 'name'),
    durationMinutes: cell(row, m, 'durationMinutes'),
    price: cell(row, m, 'price'),
    description: cell(row, m, 'description'),
  };
}

async function runServices(
  tenant: TenantCtx,
  rows: Row[],
  mapping: Mapping,
  commit: boolean,
): Promise<AnalyzeResult> {
  const existing = await prisma.service.findMany({
    where: { tenantId: tenant.id },
    select: { id: true, name: true },
  });
  const idByName = new Map(existing.map((s) => [s.name.toLowerCase(), s.id]));
  const existingNames = new Set(idByName.keys());
  const proIds = commit
    ? (
        await prisma.user.findMany({
          where: { tenantId: tenant.id, isProfessional: true },
          select: { id: true },
        })
      ).map((p) => p.id)
    : [];

  const counts = { create: 0, update: 0, skip: 0, error: 0 };
  const errors: { row: number; error: string }[] = [];
  let rowNum = 1;
  for (const row of rows) {
    rowNum++;
    const r = resolveService(readService(row, mapping), existingNames);
    if (r.disposition === 'error' || !r.write) {
      counts.error++;
      if (errors.length < 200) errors.push({ row: rowNum, error: r.error ?? 'erro' });
      continue;
    }
    if (commit) {
      try {
        await writeService(tenant.id, r.write, idByName, proIds);
      } catch {
        counts.error++;
        if (errors.length < 200) errors.push({ row: rowNum, error: 'Falha ao gravar' });
        continue;
      }
    }
    counts[r.disposition]++;
  }
  return { counts, errors, pairs: [], conflicts: [] };
}

export const analyzeServices = (t: TenantCtx, r: Row[], m: Mapping) => runServices(t, r, m, false);
export const commitServices = (t: TenantCtx, r: Row[], m: Mapping) => runServices(t, r, m, true);

async function writeService(
  tenantId: string,
  w: ServiceWrite,
  idByName: Map<string, string>,
  proIds: string[],
): Promise<void> {
  const existingId = idByName.get(w.name.toLowerCase());
  if (existingId) {
    await prisma.service.update({
      where: { id: existingId },
      data: {
        name: w.name,
        durationMinutes: w.durationMinutes,
        priceCents: w.priceCents,
        description: w.description,
      },
    });
    return;
  }
  const created = await prisma.service.create({
    data: {
      tenantId,
      name: w.name,
      durationMinutes: w.durationMinutes,
      priceCents: w.priceCents,
      description: w.description,
    },
  });
  idByName.set(w.name.toLowerCase(), created.id);
  if (proIds.length > 0) {
    await prisma.professionalService.createMany({
      data: proIds.map((professionalId) => ({ professionalId, serviceId: created.id })),
      skipDuplicates: true,
    });
  }
}
