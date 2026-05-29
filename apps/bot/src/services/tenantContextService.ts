import { formatBRL, formatDuration } from '../lib/format.js';
import prisma from '../lib/prisma.js';

const WEEKDAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

function minutesToHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatNowInTimezone(timezone: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: timezone,
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(new Date());
}

function formatAppointmentDate(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: timezone,
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Monta o snapshot do tenant (serviços, horários, agendamentos próximos) que vai
 * no `primerContext` da primeira chamada à Responses API. Como a Responses API
 * encadeia turnos via `previous_response_id`, esse contexto só precisa ser
 * enviado uma vez por sessão.
 *
 * Se `contactId` for fornecido, inclui também a seção "## Seus agendamentos"
 * com os agendamentos futuros DESTE contato — essencial pro fluxo de
 * cancelamento (LLM precisa do ID `[apt_...]` pra chamar `cancel_appointment`).
 */
export async function buildTenantContext(
  tenantId: string,
  contactId?: string,
): Promise<string> {
  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    include: {
      services: { where: { active: true }, orderBy: { name: 'asc' } },
      scheduleBlocks: { orderBy: [{ weekday: 'asc' }, { startMinute: 'asc' }] },
    },
  });

  const lines: string[] = [];

  lines.push('## Estabelecimento');
  lines.push(`Nome: ${tenant.name}`);
  lines.push(`Fuso horário: ${tenant.timezone}`);
  lines.push(`Data/hora atual: ${formatNowInTimezone(tenant.timezone)}`);
  lines.push('');

  lines.push('## Serviços disponíveis');
  if (tenant.services.length === 0) {
    lines.push('(nenhum serviço cadastrado — peça pro cliente aguardar o estabelecimento ' +
      'configurar)');
  } else {
    for (const s of tenant.services) {
      const desc = s.description ? ` — ${s.description}` : '';
      lines.push(
        `- [${s.id}] ${s.name}${desc} · ${formatDuration(s.durationMinutes)} · ${formatBRL(
          s.priceCents,
        )}`,
      );
    }
  }
  lines.push('');

  lines.push('## Horários de atendimento (toda semana)');
  // Agrupa blocos por weekday
  const byDay = new Map<number, { startMinute: number; endMinute: number }[]>();
  for (let i = 0; i < 7; i++) byDay.set(i, []);
  for (const b of tenant.scheduleBlocks) {
    byDay.get(b.weekday)!.push({ startMinute: b.startMinute, endMinute: b.endMinute });
  }
  // Imprime começando pela segunda
  const order = [1, 2, 3, 4, 5, 6, 0];
  for (const wd of order) {
    const blocks = byDay.get(wd) ?? [];
    if (blocks.length === 0) {
      lines.push(`- ${WEEKDAY_NAMES[wd]}: fechado`);
    } else {
      const ranges = blocks
        .map((b) => `${minutesToHHMM(b.startMinute)}–${minutesToHHMM(b.endMinute)}`)
        .join(', ');
      lines.push(`- ${WEEKDAY_NAMES[wd]}: ${ranges}`);
    }
  }
  lines.push('');

  // Próximos agendamentos (7 dias) — pra LLM não oferecer slots ocupados
  const now = new Date();
  const horizon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const appointments = await prisma.appointment.findMany({
    where: {
      tenantId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      startsAt: { gte: now, lt: horizon },
    },
    include: { service: true },
    orderBy: { startsAt: 'asc' },
  });

  lines.push('## Agendamentos confirmados nos próximos 7 dias');
  if (appointments.length === 0) {
    lines.push('(nenhum)');
  } else {
    for (const a of appointments) {
      lines.push(
        `- ${formatAppointmentDate(a.startsAt, tenant.timezone)} — ${a.service.name} (${formatDuration(
          a.service.durationMinutes,
        )})`,
      );
    }
  }
  lines.push('');

  // Agendamentos DESTE contato — pra LLM saber qual ID passar pro
  // cancel_appointment se o cliente pedir cancelamento.
  if (contactId) {
    const contactAppts = await prisma.appointment.findMany({
      where: {
        tenantId,
        contactId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        startsAt: { gte: now },
      },
      include: { service: true },
      orderBy: { startsAt: 'asc' },
    });

    lines.push('## Seus agendamentos (deste cliente)');
    if (contactAppts.length === 0) {
      lines.push('(nenhum)');
    } else {
      for (const a of contactAppts) {
        lines.push(
          `- [${a.id}] ${formatAppointmentDate(a.startsAt, tenant.timezone)} — ${a.service.name}`,
        );
      }
    }
  }

  return lines.join('\n');
}
