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

/**
 * Retorna a data civil (ano/mês/dia + weekday) que `instant` representa NO fuso
 * `timezone`. Usado pra ancorar a lista de "próximos dias" no calendário local
 * do tenant - sem isso o cálculo de dias usaria o fuso do servidor (UTC) e
 * poderia pular/repetir um dia perto da virada.
 */
function civilDateInTimezone(
  instant: Date,
  timezone: string,
): { year: number; month: number; day: number; weekday: number } {
  // en-CA dá ISO (YYYY-MM-DD) e é estável pra parsear.
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    weekday: weekdayMap[get('weekday')] ?? 0,
  };
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

// birthDate é guardada como meia-noite UTC - formatar com timeZone UTC pra não recuar um dia.
function formatBirthDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'UTC',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/**
 * Snapshot ESTÁTICO do tenant (nome, serviços, cadastro do cliente). Vai no
 * `primerContext` só na PRIMEIRA chamada à Responses API - como ela encadeia
 * turnos via `previous_response_id`, esse contexto não muda durante a sessão e
 * só precisa ser enviado uma vez.
 *
 * O que depende de "agora" (data atual, dias disponíveis, agendamentos) NÃO
 * entra aqui - fica em `buildLiveContext`, reenviado a cada turno. Misturar os
 * dois congelaria a data no início da conversa: uma sessão que atravessa a
 * meia-noite passaria a achar que "hoje" é o dia em que começou.
 */
export async function buildTenantPrimer(tenantId: string, contactId?: string): Promise<string> {
  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    include: {
      services: { where: { active: true }, orderBy: { name: 'asc' } },
    },
  });

  const lines: string[] = [];

  lines.push('## Estabelecimento');
  lines.push(`Nome: ${tenant.name}`);
  lines.push(`Fuso horário: ${tenant.timezone}`);
  lines.push(
    tenant.paymentProvider
      ? 'Pagamento online: disponível (Pix e cartão pelo chat após o agendamento)'
      : 'Pagamento online: indisponível (não ofereça pagamento)',
  );
  lines.push(
    'Atenção: a data de hoje e os dias/horários disponíveis vêm na nota "AGORA" de ' +
      'cada turno - use SEMPRE a mais recente, nunca uma data citada antes na conversa.',
  );
  lines.push('');

  lines.push('## Serviços disponíveis');
  if (tenant.services.length === 0) {
    lines.push(
      '(nenhum serviço cadastrado - peça pro cliente aguardar o estabelecimento ' + 'configurar)',
    );
  } else {
    for (const s of tenant.services) {
      const desc = s.description ? ` - ${s.description}` : '';
      lines.push(
        `- [${s.id}] ${s.name}${desc} · ${formatDuration(s.durationMinutes)} · ${formatBRL(
          s.priceCents,
        )}`,
      );
    }
  }
  lines.push('');

  // Cadastro DESTE contato (o nome/email/nascimento não mudam a cada turno; se
  // o cliente atualizar via save_customer_profile, o próprio LLM já sabe disso).
  if (contactId) {
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      select: { name: true, phone: true, email: true, birthDate: true, profileCompletedAt: true },
    });

    lines.push('## Cadastro do cliente');
    lines.push(`Telefone: ${contact?.phone ?? '(desconhecido)'} (já temos - não peça)`);
    lines.push(`Nome: ${contact?.name ?? '(não informado)'}`);
    lines.push(`Email: ${contact?.email ?? '(não informado)'}`);
    lines.push(
      `Data de nascimento: ${contact?.birthDate ? formatBirthDate(contact.birthDate) : '(não informado)'}`,
    );
    if (contact?.profileCompletedAt) {
      lines.push(
        'Status: cadastro confirmado. Se o nome estiver correto, NÃO confirme de novo - siga direto.',
      );
    } else {
      lines.push(
        'Status: cadastro ainda NÃO confirmado. Antes de agendar, confirme o nome (se já houver, ' +
          'pergunte "posso te chamar de X?") e ofereça email e data de nascimento (OPCIONAIS, pode ' +
          'pular). Peça a data como brasileiro ("qual sua data de nascimento?") e aceite qualquer ' +
          'jeito natural (21/03/1993, "21 de março de 93"); NUNCA peça nem repita "YYYY-MM-DD". ' +
          'Depois chame save_customer_profile.',
      );
    }
  }

  return lines.join('\n').trim();
}

/**
 * Contexto VIVO (depende de "agora"): data/hora atual, próximos dias
 * disponíveis, agendamentos e bloqueios. Reenviado em TODO turno (via
 * `systemNote`), porque tudo aqui muda com o passar do tempo - e o
 * `previous_response_id` sozinho não atualizaria nada disso.
 *
 * Se `contactId` for fornecido, inclui "## Seus agendamentos" com os IDs
 * `[apt_...]` do próprio cliente - necessários pra cancelar/remarcar.
 */
export async function buildLiveContext(tenantId: string, contactId?: string): Promise<string> {
  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    include: {
      scheduleBlocks: { orderBy: [{ weekday: 'asc' }, { startMinute: 'asc' }] },
    },
  });

  const lines: string[] = [];
  const now = new Date();
  const today = civilDateInTimezone(now, tenant.timezone);
  const dd = String(today.day).padStart(2, '0');
  const mm = String(today.month).padStart(2, '0');

  // Cabeçalho enfático: a conversa encadeada pode carregar datas antigas; esta
  // é a fonte da verdade do "hoje".
  lines.push('## AGORA (fonte da verdade - ignore qualquer data citada antes na conversa)');
  lines.push(`Data/hora atual: ${formatNowInTimezone(tenant.timezone)}`);
  lines.push(`Hoje é ${WEEKDAY_NAMES[today.weekday]}, ${dd}/${mm}.`);
  lines.push('');

  // Agrupa blocos por weekday (0=domingo … 6=sábado)
  const byDay = new Map<number, { startMinute: number; endMinute: number }[]>();
  for (let i = 0; i < 7; i++) byDay.set(i, []);
  for (const b of tenant.scheduleBlocks) {
    byDay.get(b.weekday)!.push({ startMinute: b.startMinute, endMinute: b.endMinute });
  }

  // Lista os PRÓXIMOS dias com a data civil concreta no fuso do tenant. O LLM é
  // ruim em aritmética de calendário ("hoje é sábado, então sexta é dia X") e
  // chegava a oferecer datas já passadas. Entregando as datas prontas, ele só
  // copia - nunca calcula. Dias fechados/passados simplesmente não aparecem.
  const HORIZON_DAYS = 14;
  // Meio-dia UTC do dia civil de hoje: longe o suficiente das viradas pra somar
  // dias com aritmética de UTC sem cair em DST (o Brasil não usa, mas é seguro).
  const cursor = new Date(Date.UTC(today.year, today.month - 1, today.day, 12, 0, 0));

  lines.push('## Próximos dias disponíveis (ofereça SOMENTE estas datas; a primeira é HOJE)');
  let openDays = 0;
  for (let i = 0; i < HORIZON_DAYS; i++) {
    const d = new Date(cursor.getTime() + i * 24 * 60 * 60 * 1000);
    const civil = civilDateInTimezone(d, tenant.timezone);
    const blocks = byDay.get(civil.weekday) ?? [];
    if (blocks.length === 0) continue; // dia fechado: não lista
    const cdd = String(civil.day).padStart(2, '0');
    const cmm = String(civil.month).padStart(2, '0');
    const ranges = blocks
      .map((b) => `${minutesToHHMM(b.startMinute)} às ${minutesToHHMM(b.endMinute)}`)
      .join(', ');
    const todayTag = i === 0 ? ' (HOJE)' : '';
    lines.push(`- ${WEEKDAY_NAMES[civil.weekday]} ${cdd}/${cmm}${todayTag}: ${ranges}`);
    openDays++;
  }
  if (openDays === 0) {
    lines.push('(nenhum dia de atendimento configurado - peça pro cliente aguardar)');
  }
  lines.push('');

  // Próximos agendamentos (7 dias) - pra LLM não oferecer slots ocupados
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
        `- ${formatAppointmentDate(a.startsAt, tenant.timezone)} - ${a.service.name} (${formatDuration(
          a.service.durationMinutes,
        )})`,
      );
    }
  }
  lines.push('');

  // Bloqueios da agenda (folga/compromisso do dono) nos próximos 7 dias - a LLM
  // NÃO deve oferecer horários dentro deles (bookAppointment também recusaria).
  const exceptions = await prisma.scheduleException.findMany({
    where: { tenantId, endsAt: { gt: now }, startsAt: { lt: horizon } },
    orderBy: { startsAt: 'asc' },
  });
  lines.push('## Horários BLOQUEADOS na agenda (NÃO oferecer) nos próximos 7 dias');
  if (exceptions.length === 0) {
    lines.push('(nenhum)');
  } else {
    for (const e of exceptions) {
      const reason = e.reason ? ` - ${e.reason}` : '';
      lines.push(
        `- de ${formatAppointmentDate(e.startsAt, tenant.timezone)} até ${formatAppointmentDate(
          e.endsAt,
          tenant.timezone,
        )}${reason}`,
      );
    }
  }

  // Agendamentos DESTE contato (com IDs [apt_...] pra cancelar/remarcar).
  if (contactId) {
    const contactAppts = await prisma.appointment.findMany({
      where: {
        tenantId,
        contactId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        startsAt: { gte: now },
      },
      include: { service: true, series: { select: { frequency: true } } },
      orderBy: { startsAt: 'asc' },
    });

    const FREQUENCY_LABEL: Record<string, string> = {
      WEEKLY: 'semanal',
      BIWEEKLY: 'quinzenal',
      MONTHLY: 'mensal',
    };

    lines.push('');
    lines.push('## Seus agendamentos (deste cliente)');
    if (contactAppts.length === 0) {
      lines.push('(nenhum)');
    } else {
      for (const a of contactAppts) {
        // Marca a recorrência (e agrupa pelo seriesId) pra o LLM saber que um
        // cancelamento pode envolver vários - pergunte se é só este ou a série toda.
        const rec = a.series
          ? ` (recorrente ${FREQUENCY_LABEL[a.series.frequency] ?? ''} · série ${a.seriesId})`
          : '';
        lines.push(
          `- [${a.id}] ${formatAppointmentDate(a.startsAt, tenant.timezone)} - ${a.service.name}${rec}`,
        );
      }
    }
  }

  return lines.join('\n').trim();
}
