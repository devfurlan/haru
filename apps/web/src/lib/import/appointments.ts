// Spec de importação de AGENDAMENTOS (Appointment) - o mais complexo: precisa resolver 3
// FKs (cliente por telefone/nome, serviço por nome, profissional por nome com fallback
// solo), converter data local do tenant -> UTC e deduplicar por (cliente, serviço, início).
// resolveAppointment é PURO (recebe os conjuntos já carregados); applyAppointments carrega
// tudo de uma vez, resolve em memória e, se não for dryRun, cria (upsertando o contato que
// faltar por telefone). Não cria Payment/lembrete/série - é dado histórico/agenda pura.

import type { AppointmentStatus } from '@haru/database';
import { prisma } from '@haru/database';
import { localWallTimeToUtc, normalizePhoneBR } from '@haru/shared';

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

const VALID_PHONE = /^55\d{10,11}$/;

export interface ApptInput {
  customerPhone: string;
  customerName: string;
  serviceName: string;
  professionalName: string;
  date: string;
  time: string;
  status: string;
}

export interface ApptCtx {
  servicesByName: Map<string, { id: string; durationMinutes: number }>;
  contactsByPhone: Map<string, string>;
  contactsByName: Map<string, string[]>;
  prosByName: Map<string, string>;
  proIds: string[];
  tz: string;
  now: number;
  /** Chaves já existentes no banco: `${contactId}|${serviceId}|${iso}`. */
  existingKeys: Set<string>;
  /** Deduplicação dentro do lote (mutado). */
  seen: Set<string>;
}

export interface ApptWrite {
  contactId: string | null;
  contactPhone: string | null;
  contactName: string | null;
  serviceId: string;
  professionalId: string;
  startsAt: Date;
  endsAt: Date;
  status: AppointmentStatus;
}

/** Mapeia o texto de status da origem pro enum; sem match, decide por passado/futuro. */
function mapStatus(raw: string, startsMs: number, nowMs: number): AppointmentStatus {
  const s = raw.toLowerCase();
  if (s.includes('cancel')) return 'CANCELED';
  if (/(conclu|realiz|atend|finaliz|complet|pago)/.test(s)) return 'COMPLETED';
  if (/(falt|no.?show|ausen)/.test(s)) return 'NO_SHOW';
  if (s.includes('confirm')) return 'CONFIRMED';
  if (s.includes('pend') || s.includes('aguard')) return 'PENDING';
  return startsMs < nowMs ? 'COMPLETED' : 'CONFIRMED';
}

/** Puro. `ctx.seen` é mutado pra deduplicar dentro do lote. */
export function resolveAppointment(
  input: ApptInput,
  ctx: ApptCtx,
): RowResult & { write?: ApptWrite } {
  const sName = input.serviceName.trim();
  if (!sName) return { disposition: 'error', error: 'Sem serviço' };
  const svc = ctx.servicesByName.get(sName.toLowerCase());
  if (!svc)
    return {
      disposition: 'error',
      error: `Serviço "${sName}" não cadastrado - importe serviços antes`,
    };

  const parsed = parseImportDate(input.date, input.time || undefined);
  if (!parsed) return { disposition: 'error', error: `Data inválida: "${input.date}"` };
  const startsAt = localWallTimeToUtc(parsed.dateStr, parsed.minutes, ctx.tz);
  const endsAt = new Date(startsAt.getTime() + svc.durationMinutes * 60_000);

  let professionalId: string;
  const pName = input.professionalName.trim();
  if (pName) {
    const pid = ctx.prosByName.get(pName.toLowerCase());
    if (!pid) return { disposition: 'error', error: `Profissional "${pName}" não encontrado` };
    professionalId = pid;
  } else if (ctx.proIds.length === 1) {
    professionalId = ctx.proIds[0];
  } else if (ctx.proIds.length === 0) {
    return { disposition: 'error', error: 'Nenhum profissional cadastrado' };
  } else {
    return { disposition: 'error', error: 'Profissional não informado (há vários no cadastro)' };
  }

  let contactId: string | null = null;
  let contactPhone: string | null = null;
  const contactName = input.customerName.trim() || null;
  if (input.customerPhone.trim()) {
    const p = normalizePhoneBR(input.customerPhone);
    if (!VALID_PHONE.test(p))
      return {
        disposition: 'error',
        error: `Telefone do cliente inválido: "${input.customerPhone}"`,
      };
    contactPhone = p;
    contactId = ctx.contactsByPhone.get(p) ?? null;
  } else if (contactName) {
    const matches = ctx.contactsByName.get(contactName.toLowerCase()) ?? [];
    if (matches.length === 1) contactId = matches[0];
    else if (matches.length === 0)
      return {
        disposition: 'error',
        error: `Cliente "${contactName}" não encontrado (inclua telefone ou importe clientes antes)`,
      };
    else
      return {
        disposition: 'error',
        error: `Cliente "${contactName}" ambíguo (vários com esse nome)`,
      };
  } else {
    return { disposition: 'error', error: 'Sem cliente (informe telefone ou nome)' };
  }

  const status = mapStatus(input.status, startsAt.getTime(), ctx.now);

  const contactKey = contactId ?? `phone:${contactPhone}`;
  const key = `${contactKey}|${svc.id}|${startsAt.toISOString()}`;
  if (ctx.existingKeys.has(key) || ctx.seen.has(key)) return { disposition: 'skip' };
  ctx.seen.add(key);

  return {
    disposition: 'create',
    write: {
      contactId,
      contactPhone,
      contactName,
      serviceId: svc.id,
      professionalId,
      startsAt,
      endsAt,
      status,
    },
  };
}

function readAppt(row: Row, m: Mapping): ApptInput {
  return {
    customerPhone: cell(row, m, 'customerPhone'),
    customerName: cell(row, m, 'customerName'),
    serviceName: cell(row, m, 'serviceName'),
    professionalName: cell(row, m, 'professionalName'),
    date: cell(row, m, 'date'),
    time: cell(row, m, 'time'),
    status: cell(row, m, 'status'),
  };
}

export async function applyAppointments(
  tenant: TenantCtx,
  rows: Row[],
  mapping: Mapping,
  dryRun: boolean,
): Promise<ApplyResult> {
  const [services, contacts, pros, existingAppts] = await Promise.all([
    prisma.service.findMany({
      where: { tenantId: tenant.id },
      select: { id: true, name: true, durationMinutes: true },
    }),
    prisma.contact.findMany({
      where: { tenantId: tenant.id },
      select: { id: true, phone: true, name: true },
    }),
    prisma.user.findMany({
      where: { tenantId: tenant.id, isProfessional: true },
      select: { id: true, name: true },
    }),
    prisma.appointment.findMany({
      where: { tenantId: tenant.id },
      select: { contactId: true, serviceId: true, startsAt: true },
    }),
  ]);

  const servicesByName = new Map(
    services.map((s) => [s.name.toLowerCase(), { id: s.id, durationMinutes: s.durationMinutes }]),
  );
  const contactsByPhone = new Map<string, string>();
  const contactsByName = new Map<string, string[]>();
  for (const c of contacts) {
    if (c.phone) contactsByPhone.set(c.phone, c.id);
    if (c.name) {
      const k = c.name.toLowerCase();
      const arr = contactsByName.get(k);
      if (arr) arr.push(c.id);
      else contactsByName.set(k, [c.id]);
    }
  }
  const prosByName = new Map<string, string>();
  for (const p of pros) if (p.name) prosByName.set(p.name.toLowerCase(), p.id);
  const existingKeys = new Set(
    existingAppts.map((a) => `${a.contactId}|${a.serviceId}|${a.startsAt.toISOString()}`),
  );

  const ctx: ApptCtx = {
    servicesByName,
    contactsByPhone,
    contactsByName,
    prosByName,
    proIds: pros.map((p) => p.id),
    tz: tenant.timezone,
    now: Date.now(),
    existingKeys,
    seen: new Set(),
  };

  const counts = { create: 0, update: 0, skip: 0, error: 0 };
  const results: RowResult[] = [];
  for (const row of rows) {
    const r = resolveAppointment(readAppt(row, mapping), ctx);
    if (r.disposition === 'error') {
      counts.error++;
      results.push({ disposition: 'error', error: r.error });
      continue;
    }
    if (r.disposition === 'skip' || !r.write) {
      counts.skip++;
      results.push({ disposition: 'skip' });
      continue;
    }
    if (!dryRun) {
      try {
        await writeAppointment(tenant.id, r.write, ctx);
      } catch {
        counts.error++;
        results.push({ disposition: 'error', error: 'Falha ao gravar' });
        continue;
      }
    }
    counts.create++;
    results.push({ disposition: 'create' });
  }
  return { counts, rows: results };
}

async function writeAppointment(tenantId: string, w: ApptWrite, ctx: ApptCtx): Promise<void> {
  let contactId = w.contactId;
  if (!contactId && w.contactPhone) {
    const contact = await prisma.contact.upsert({
      where: { tenantId_phone: { tenantId, phone: w.contactPhone } },
      update: w.contactName ? { name: w.contactName } : {},
      create: { tenantId, phone: w.contactPhone, name: w.contactName },
    });
    contactId = contact.id;
    ctx.contactsByPhone.set(w.contactPhone, contact.id);
  }
  if (!contactId) throw new Error('sem contato');
  await prisma.appointment.create({
    data: {
      tenantId,
      contactId,
      serviceId: w.serviceId,
      professionalId: w.professionalId,
      startsAt: w.startsAt,
      endsAt: w.endsAt,
      status: w.status,
    },
  });
  ctx.existingKeys.add(`${contactId}|${w.serviceId}|${w.startsAt.toISOString()}`);
}
