// Spec de AGENDAMENTOS (futuros) e HISTÓRICO (passados) - mesmo motor, `mode` decide.
// Resolve 3 FKs (cliente por telefone/nome, serviço por nome, profissional com fallback
// solo), converte data local -> UTC, deduplica por (cliente, serviço, início). No modo
// 'future' o analyze detecta CONFLITO de horário contra a agenda existente (mesmo
// profissional, intervalos sobrepostos, reserva diferente); no commit o usuário escolhe
// pular (default) ou importar assim mesmo. 'history' grava status COMPLETED e não detecta
// conflito (histórico se sobrepõe naturalmente).
// ponytail: o "valor pago" do histórico é lido mas não persistido - não há campo pra ele
// no Appointment; upgrade = coluna nova ou Payment manual.

import type { AppointmentStatus } from '@haru/database';
import { prisma } from '@haru/database';
import { localWallTimeToUtc, normalizePhoneBR } from '@haru/shared';

import {
  type AnalyzeResult,
  cell,
  type Mapping,
  parseImportDate,
  type Resolutions,
  type Row,
  type RowResult,
  type ScheduleConflict,
} from './mapping';

interface TenantCtx {
  id: string;
  timezone: string;
}

type Mode = 'future' | 'history';
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
  existingKeys: Set<string>;
  seen: Set<string>;
  mode: Mode;
}

export interface ApptWrite {
  contactId: string | null;
  contactPhone: string | null;
  contactName: string | null;
  serviceId: string;
  serviceName: string;
  professionalId: string;
  startsAt: Date;
  endsAt: Date;
  status: AppointmentStatus;
}

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

  const status =
    ctx.mode === 'history' ? 'COMPLETED' : mapStatus(input.status, startsAt.getTime(), ctx.now);

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
      serviceName: sName,
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

interface ExistingSlot {
  start: number;
  end: number;
  label: string;
}

function formatWhen(date: Date, tz: string, proName: string): string {
  const day = new Intl.DateTimeFormat('pt-BR', {
    timeZone: tz,
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(date);
  const time = new Intl.DateTimeFormat('pt-BR', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
  return proName ? `${day} · ${time} · com ${proName}` : `${day} · ${time}`;
}

async function runAppointments(
  tenant: TenantCtx,
  rows: Row[],
  mapping: Mapping,
  mode: Mode,
  commit: boolean,
  resolutions?: Resolutions,
): Promise<AnalyzeResult> {
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
      where: { tenantId: tenant.id, status: { not: 'CANCELED' } },
      select: {
        contactId: true,
        serviceId: true,
        professionalId: true,
        startsAt: true,
        endsAt: true,
        contact: { select: { name: true } },
        service: { select: { name: true } },
      },
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
  const proNameById = new Map<string, string>();
  for (const p of pros) {
    if (p.name) {
      prosByName.set(p.name.toLowerCase(), p.id);
      proNameById.set(p.id, p.name);
    }
  }
  const existingKeys = new Set(
    existingAppts.map((a) => `${a.contactId}|${a.serviceId}|${a.startsAt.toISOString()}`),
  );
  // Slots ocupados por profissional (pra detectar conflito).
  const busyByPro = new Map<string, ExistingSlot[]>();
  for (const a of existingAppts) {
    const slot: ExistingSlot = {
      start: a.startsAt.getTime(),
      end: a.endsAt.getTime(),
      label: `${a.service.name} · ${a.contact.name ?? 'cliente'}`,
    };
    const arr = busyByPro.get(a.professionalId);
    if (arr) arr.push(slot);
    else busyByPro.set(a.professionalId, [slot]);
  }

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
    mode,
  };

  const forcedImport = new Set(
    Object.entries(resolutions?.conflicts ?? {})
      .filter(([, v]) => v === 'import')
      .map(([k]) => k),
  );

  const counts = { create: 0, update: 0, skip: 0, error: 0 };
  const errors: { row: number; error: string }[] = [];
  const conflicts: ScheduleConflict[] = [];

  let rowNum = 1;
  for (const row of rows) {
    rowNum++;
    const r = resolveAppointment(readAppt(row, mapping), ctx);
    if (r.disposition === 'error') {
      counts.error++;
      if (errors.length < 200) errors.push({ row: rowNum, error: r.error ?? 'erro' });
      continue;
    }
    if (r.disposition === 'skip' || !r.write) {
      counts.skip++;
      continue;
    }

    // Conflito de horário (só agenda futura).
    const conflictId = `c${rowNum}`;
    let clash: ExistingSlot | undefined;
    if (mode === 'future') {
      const busy = busyByPro.get(r.write.professionalId);
      if (busy)
        clash = busy.find(
          (b) => r.write!.startsAt.getTime() < b.end && r.write!.endsAt.getTime() > b.start,
        );
    }
    if (clash && !forcedImport.has(conflictId)) {
      if (!commit) {
        if (conflicts.length < 50) {
          conflicts.push({
            id: conflictId,
            when: formatWhen(
              r.write.startsAt,
              tenant.timezone,
              proNameById.get(r.write.professionalId) ?? '',
            ),
            incomingLabel: `${r.write.serviceName} · ${r.write.contactName ?? formatPhoneBRSafe(r.write.contactPhone)}`,
            incomingMeta: 'na planilha',
            existingLabel: clash.label,
            existingMeta: 'já na sua agenda',
          });
        }
      }
      counts.skip++;
      continue; // default = pular o conflito
    }

    if (commit) {
      try {
        await writeAppointment(tenant.id, r.write, ctx, busyByPro);
      } catch {
        counts.error++;
        if (errors.length < 200) errors.push({ row: rowNum, error: 'Falha ao gravar' });
        continue;
      }
    }
    counts.create++;
  }

  return { counts, errors, pairs: [], conflicts };
}

function formatPhoneBRSafe(phone: string | null): string {
  return phone ?? 'cliente';
}

export const analyzeAppointments = (t: TenantCtx, r: Row[], m: Mapping) =>
  runAppointments(t, r, m, 'future', false);
export const commitAppointments = (t: TenantCtx, r: Row[], m: Mapping, res?: Resolutions) =>
  runAppointments(t, r, m, 'future', true, res);
export const analyzeHistory = (t: TenantCtx, r: Row[], m: Mapping) =>
  runAppointments(t, r, m, 'history', false);
export const commitHistory = (t: TenantCtx, r: Row[], m: Mapping, res?: Resolutions) =>
  runAppointments(t, r, m, 'history', true, res);

async function writeAppointment(
  tenantId: string,
  w: ApptWrite,
  ctx: ApptCtx,
  busyByPro: Map<string, ExistingSlot[]>,
): Promise<void> {
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
  const arr = busyByPro.get(w.professionalId);
  const slot: ExistingSlot = {
    start: w.startsAt.getTime(),
    end: w.endsAt.getTime(),
    label: w.serviceName,
  };
  if (arr) arr.push(slot);
  else busyByPro.set(w.professionalId, [slot]);
}
