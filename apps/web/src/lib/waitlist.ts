import 'server-only';

// Engine da FILA DE ESPERA (fila por tenant + profissional + dia). Quando um horário
// vaga (cancelamento/remarcação), triggerWaitlistMatch abre um episódio (WaitlistOffer),
// congela os horários livres desse dia (reserva temporária derivada) e notifica em ondas
// quem espera. O cron chama advanceWaitlistWaves; o cliente chama confirmWaitlistSlot.
//
// Regras de negócio no plano aprovado. Canais reusam a infra existente: push (expo-push),
// WhatsApp pela PLATAFORMA (comms/whatsapp) e notificação in-app do dono (comms/notifications).

import { type CustomerAccount, prisma } from '@haru/database';
import { hasWaitlist } from '@haru/billing';

import {
  BOOKING_HORIZON_DAYS,
  formatBRL,
  isoDateInTz,
  localWallTimeToUtc,
  normalizePhoneBR,
  weekdayInTz,
} from '@haru/shared';

import { createBookingCore } from '@/lib/appointment-mutations';
import { createNotification } from '@/lib/comms/notifications';
import { sendPlatformWhatsapp } from '@/lib/comms/whatsapp';
import { appUrl } from '@/lib/email';
import { sendPushSafe } from '@/lib/comms/push';
import { getServiceDaySlots, loadDayAvailability } from '@/lib/professionals';
import { resolvePublicContactId } from '@/lib/public-booking';
import {
  dateStrOf,
  dbDate,
  dayLabel,
  evaluateEligibility,
  type EligibilityResult,
  nextWave,
  WAVE_SIZE,
} from '@/lib/waitlist-core';

/**
 * Folga da reserva além do fim da janela da onda. `nextWaveAt` é o instante em que o cron
 * (minutely) avança/fecha o episódio; sem folga, entre o fim da janela e o cron rodar (até
 * ~60s) a reserva lapsaria e o fluxo normal marcaria por cima. holdExpiresAt = nextWaveAt +
 * esta folga mantém o slot congelado nessa fronteira até o cron re-estender ou fechar.
 */
const HOLD_GRACE_MS = 90_000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PHONE_RE = /^55\d{10,11}$/;

// --- Elegibilidade -----------------------------------------------------------

/**
 * Valida server-side se o cliente pode entrar na fila: o dia tem que estar LOTADO pro
 * profissional (sem horário livre) E o expediente daquele dia ainda não pode ter acabado.
 * Reusa getServiceDaySlots (horários livres) e loadDayAvailability (grade do profissional).
 */
export async function checkWaitlistEligibility(args: {
  tenantId: string;
  professionalId: string;
  serviceId: string;
  dateStr: string;
  now: Date;
}): Promise<EligibilityResult> {
  const { tenantId, professionalId, serviceId, dateStr, now } = args;
  if (!DATE_RE.test(dateStr))
    return { eligible: false, code: 'invalidInput', reason: 'Data inválida' };

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { timezone: true, waitlistEnabled: true, subscription: true },
  });
  if (!tenant)
    return { eligible: false, code: 'invalidInput', reason: 'Estabelecimento não encontrado' };
  const tz = tenant.timezone;

  const service = await prisma.service.findFirst({
    where: { id: serviceId, tenantId, active: true },
    select: { durationMinutes: true },
  });
  if (!service)
    return { eligible: false, code: 'invalidInput', reason: 'Serviço não encontrado' };

  const today = isoDateInTz(now, tz);
  const maxDate = isoDateInTz(
    new Date(now.getTime() + (BOOKING_HORIZON_DAYS - 1) * 86_400_000),
    tz,
  );

  // Grade do profissional no dia (fim de expediente). loadDayAvailability já traz os blocks.
  const [avail] = await loadDayAvailability({
    tenantId,
    professionalIds: [professionalId],
    tz,
    dateStr,
  });
  const weekday = weekdayInTz(dateStr, tz);
  const dayBlocks = (avail?.blocks ?? []).filter((b) => b.weekday === weekday);
  const worksThatDay = dayBlocks.length > 0;
  const expedienteOver =
    worksThatDay &&
    now >= localWallTimeToUtc(dateStr, Math.max(...dayBlocks.map((b) => b.endMinute)), tz);

  // Dia lotado = sem NENHUM horário livre pro profissional (includeBusy default false).
  const slots = worksThatDay
    ? await getServiceDaySlots({
        tenantId,
        serviceId,
        tz,
        durationMinutes: service.durationMinutes,
        dateStr,
        now,
        professionalId,
      })
    : [];

  return evaluateEligibility({
    // Fila é feature Time+ (Solo não tem): o gate de plano entra junto do toggle do dono.
    waitlistEnabled: tenant.waitlistEnabled && hasWaitlist(tenant.subscription),
    past: dateStr < today,
    beyondHorizon: dateStr > maxDate,
    worksThatDay,
    expedienteOver,
    hasFreeSlot: slots.length > 0,
  });
}

// --- Entrar na fila ----------------------------------------------------------

export type JoinResult = { ok: true; entryId: string } | { error: string };

/**
 * Coloca o cliente na fila daquele dia + profissional. Valida elegibilidade, resolve o
 * Contact (mesma regra do booking) e faz upsert da entry (re-entrar = reativa). Dispara o
 * push "entrou na fila" (só push; sem app é silencioso - o WhatsApp é reservado ao "abriu").
 */
export async function joinWaitlist(args: {
  slug: string;
  serviceId: string;
  professionalId: string;
  dateStr: string;
  name: string;
  phone?: string;
  account: CustomerAccount | null;
  now: Date;
}): Promise<JoinResult> {
  const {
    slug,
    serviceId,
    professionalId,
    dateStr,
    name: rawName,
    phone: rawPhone,
    account,
    now,
  } = args;

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true, timezone: true, waitlistEnabled: true, name: true },
  });
  if (!tenant) return { error: 'Estabelecimento não encontrado' };
  if (!tenant.waitlistEnabled) return { error: 'Fila de espera indisponível' };

  const name = rawName.trim();
  if (name.length < 2) return { error: 'Informe seu nome' };
  const phone = rawPhone ? normalizePhoneBR(rawPhone) : '';
  if (phone && !PHONE_RE.test(phone)) return { error: 'WhatsApp inválido - confira o DDD' };
  if (!phone && !account) return { error: 'Entre na sua conta pra entrar na fila.' };

  const elig = await checkWaitlistEligibility({
    tenantId: tenant.id,
    professionalId,
    serviceId,
    dateStr,
    now,
  });
  if (!elig.eligible) return { error: elig.reason };

  const contactId = await resolvePublicContactId({ tenantId: tenant.id, name, phone, account });
  const date = dbDate(dateStr);

  const entry = await prisma.waitlistEntry.upsert({
    where: {
      tenantId_professionalId_date_contactId: {
        tenantId: tenant.id,
        professionalId,
        date,
        contactId,
      },
    },
    update: { status: 'WAITING', serviceId },
    create: { tenantId: tenant.id, professionalId, serviceId, contactId, date, status: 'WAITING' },
  });

  notifyClientJoined(entry.id, tenant.timezone, professionalId, dateStr).catch((err) =>
    console.error('[waitlist] push de entrada falhou', err),
  );

  return { ok: true, entryId: entry.id };
}

// --- Match (horário vagou) ---------------------------------------------------

/**
 * Chamado fire-and-forget pelos cores de cancelamento/remarcação quando um horário vaga.
 * Abre um episódio (WaitlistOffer) e notifica a onda 1 na hora, SE: a fila estiver ligada,
 * o dia não for passado, houver alguém esperando (tenant, pro, dia), e não houver episódio
 * ACTIVE em curso pra esse trio.
 */
export async function triggerWaitlistMatch(args: {
  tenantId: string;
  professionalId: string;
  freedDate: string;
  now: Date;
}): Promise<void> {
  const { tenantId, professionalId, freedDate, now } = args;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      timezone: true,
      waitlistEnabled: true,
      waitlistWindowMinutes: true,
      waitlistNotifyAllAtOnce: true,
      name: true,
      slug: true,
      subscription: true,
    },
  });
  // Fila só abre episódio se ligada E o plano é Time+ (Solo não tem fila).
  if (!tenant || !tenant.waitlistEnabled || !hasWaitlist(tenant.subscription)) return;
  if (freedDate < isoDateInTz(now, tenant.timezone)) return;

  const date = dbDate(freedDate);

  const active = await prisma.waitlistOffer.findFirst({
    where: { tenantId, professionalId, date, status: 'ACTIVE' },
    select: { id: true },
  });
  // ponytail: dois cancelamentos simultâneos podem abrir 2 offers (sem unique parcial em
  // Postgres). O 2º só duplica a notificação de uma onda; ambos congelam o mesmo dia e o
  // extra exaure sozinho. Aceitável na janela de corrida.
  if (active) return;

  const waiting = await prisma.waitlistEntry.findMany({
    where: { tenantId, professionalId, date, status: 'WAITING' },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (waiting.length === 0) return;

  const firstWave = nextWave(waiting, [], WAVE_SIZE, tenant.waitlistNotifyAllAtOnce);
  const nextWaveAt = new Date(now.getTime() + tenant.waitlistWindowMinutes * 60_000);

  const offer = await prisma.waitlistOffer.create({
    data: {
      tenantId,
      professionalId,
      date,
      wave: 1,
      nextWaveAt,
      holdExpiresAt: new Date(nextWaveAt.getTime() + HOLD_GRACE_MS),
      notifiedEntryIds: firstWave.map((e) => e.id),
      status: 'ACTIVE',
    },
  });

  await notifyWave(
    offer.id,
    tenantId,
    professionalId,
    freedDate,
    tenant,
    firstWave.map((e) => e.id),
  );
}

/**
 * Chamado pelo cron (a cada ~1 min). Avança os episódios cuja janela expirou: notifica a
 * próxima onda; se a fila acabou sem confirmação, encerra o episódio e LIBERA a reserva
 * (o horário volta a ficar livre normalmente). Idempotente por episódio.
 */
export async function advanceWaitlistWaves(
  now: Date,
): Promise<{ advanced: number; closed: number }> {
  let advanced = 0;
  let closed = 0;

  const due = await prisma.waitlistOffer.findMany({
    where: { status: 'ACTIVE', nextWaveAt: { lte: now } },
    orderBy: { nextWaveAt: 'asc' },
    take: 200,
  });

  for (const offer of due) {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: offer.tenantId },
        select: {
          timezone: true,
          waitlistEnabled: true,
          waitlistWindowMinutes: true,
          waitlistNotifyAllAtOnce: true,
          name: true,
          slug: true,
          subscription: true,
        },
      });
      const dateStr = dateStrOf(offer.date);
      // Sem tenant, fila desligada/plano rebaixado no meio do episódio, ou dia já passado:
      // encerra e LIBERA a reserva (parar as ondas em curso e destravar os slots).
      if (
        !tenant ||
        !tenant.waitlistEnabled ||
        !hasWaitlist(tenant.subscription) ||
        dateStr < isoDateInTz(now, tenant.timezone)
      ) {
        await closeOffer(offer.id, now);
        closed++;
        continue;
      }

      const waiting = await prisma.waitlistEntry.findMany({
        where: {
          tenantId: offer.tenantId,
          professionalId: offer.professionalId,
          date: offer.date,
          status: 'WAITING',
        },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });
      const wave = nextWave(
        waiting,
        offer.notifiedEntryIds,
        WAVE_SIZE,
        tenant.waitlistNotifyAllAtOnce,
      );

      if (wave.length === 0) {
        await closeOffer(offer.id, now);
        closed++;
        continue;
      }

      const nextWaveAt = new Date(now.getTime() + tenant.waitlistWindowMinutes * 60_000);
      await prisma.waitlistOffer.update({
        where: { id: offer.id },
        data: {
          wave: { increment: 1 },
          nextWaveAt,
          holdExpiresAt: new Date(nextWaveAt.getTime() + HOLD_GRACE_MS),
          notifiedEntryIds: { push: wave.map((e) => e.id) },
        },
      });
      await notifyWave(
        offer.id,
        offer.tenantId,
        offer.professionalId,
        dateStr,
        tenant,
        wave.map((e) => e.id),
      );
      advanced++;
    } catch (err) {
      console.error('[waitlist] avanço de onda falhou p/ offer', offer.id, err);
    }
  }

  return { advanced, closed };
}

async function closeOffer(offerId: string, now: Date): Promise<void> {
  // holdExpiresAt = now libera imediatamente a reserva (isSlotFrozenByWaitlist volta a false).
  await prisma.waitlistOffer.updateMany({
    where: { id: offerId, status: 'ACTIVE' },
    data: { status: 'EXHAUSTED', holdExpiresAt: now },
  });
}

// --- Reserva temporária (freeze derivado) ------------------------------------

/**
 * Um horário desse (tenant, profissional, dia) está reservado pela fila? True enquanto
 * existir um episódio ACTIVE com holdExpiresAt no futuro (exceto `exceptOfferId`, usado
 * pela própria confirmação pra não bloquear a si mesma). Guarda autoritativa contra
 * "marcar por cima" - chamada nos pontos que ESCREVEM um agendamento num slot.
 */
export async function isSlotFrozenByWaitlist(
  tenantId: string,
  professionalId: string,
  dateStr: string,
  now: Date,
  exceptOfferId?: string,
): Promise<boolean> {
  const frozen = await prisma.waitlistOffer.findFirst({
    where: {
      tenantId,
      professionalId,
      date: dbDate(dateStr),
      status: 'ACTIVE',
      holdExpiresAt: { gt: now },
      ...(exceptOfferId ? { id: { not: exceptOfferId } } : {}),
    },
    select: { id: true },
  });
  return frozen !== null;
}

// --- Confirmar (cliente escolheu um horário) ---------------------------------

export type ConfirmResult =
  | { ok: true; appointmentId: string }
  | { error: string; taken?: boolean };

/**
 * O cliente da fila escolheu um horário livre e confirma. Revalida o slot (ignorando o
 * próprio freeze), cria o agendamento (marcado fromWaitlist), encerra a inscrição + o
 * episódio e libera a reserva dos outros horários. Notifica cliente ("Fechado!") e dono
 * (in-app "vaga recuperada"). Corrida ("alguém pegou antes") NÃO gera push (spec).
 */
export async function confirmWaitlistSlot(args: {
  offerId: string;
  entryId: string;
  startsAt: Date;
  now: Date;
  /** Quando presente (fluxo autenticado, ex.: app), exige que a inscrição seja desta conta. */
  accountId?: string;
}): Promise<ConfirmResult> {
  const { offerId, entryId, startsAt, now, accountId } = args;

  const offer = await prisma.waitlistOffer.findUnique({ where: { id: offerId } });
  if (!offer || offer.status !== 'ACTIVE' || offer.holdExpiresAt <= now) {
    return { error: 'Essa oferta expirou. Você segue na fila.', taken: true };
  }

  const entry = await prisma.waitlistEntry.findUnique({
    where: { id: entryId },
    include: {
      service: { select: { durationMinutes: true } },
      contact: { select: { customerAccountId: true } },
    },
  });
  if (
    !entry ||
    entry.status !== 'WAITING' ||
    entry.tenantId !== offer.tenantId ||
    entry.professionalId !== offer.professionalId ||
    dateStrOf(entry.date) !== dateStrOf(offer.date)
  ) {
    return { error: 'Inscrição inválida' };
  }
  if (accountId && entry.contact.customerAccountId !== accountId) {
    return { error: 'Inscrição inválida' };
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: offer.tenantId },
    select: { timezone: true },
  });
  if (!tenant) return { error: 'Estabelecimento não encontrado' };
  const dateStr = dateStrOf(offer.date);

  // Revalida o slot escolhido nos horários livres reais (ignora o próprio freeze).
  const slots = await getServiceDaySlots({
    tenantId: offer.tenantId,
    serviceId: entry.serviceId,
    tz: tenant.timezone,
    durationMinutes: entry.service.durationMinutes,
    dateStr,
    now,
    professionalId: offer.professionalId,
  });
  if (!slots.some((s) => s.startsAtIso === startsAt.toISOString())) {
    return { error: 'Esse horário não está mais disponível. Escolha outro.' };
  }

  const created = await createBookingCore({
    tenantId: offer.tenantId,
    contactId: entry.contactId,
    serviceId: entry.serviceId,
    professionalId: offer.professionalId,
    startsAt,
    durationMinutes: entry.service.durationMinutes,
    status: 'CONFIRMED',
    notifyOwner: false, // o dono recebe a notificação "vaga recuperada" abaixo (não o e-mail comum)
    fromWaitlist: true,
    waitlistOfferId: offer.id,
  });
  if ('error' in created) {
    // Alguém foi mais rápido: NÃO notifica o perdedor. Segue WAITING.
    return { error: 'Alguém foi mais rápido - você segue na fila.', taken: true };
  }

  await prisma.$transaction([
    prisma.waitlistEntry.update({ where: { id: entry.id }, data: { status: 'FULFILLED' } }),
    prisma.waitlistOffer.update({
      where: { id: offer.id },
      data: { status: 'FULFILLED', holdExpiresAt: now },
    }),
  ]);

  notifyClientConfirmed(entry.contactId, entry.professionalId, tenant.timezone, startsAt).catch(
    (err) => console.error('[waitlist] confirmação ao cliente falhou', err),
  );
  notifyOwnerRecovered(
    offer.tenantId,
    entry.serviceId,
    entry.professionalId,
    tenant.timezone,
    startsAt,
  ).catch((err) => console.error('[waitlist] notificação ao dono falhou', err));

  return { ok: true, appointmentId: created.appointmentId };
}

// --- Ver oferta (tela de confirmação) ----------------------------------------

export type WaitlistOfferView = {
  offerId: string;
  entryId: string;
  /** Oferta encerrada/expirada (ex.: alguém pegou antes). O cliente segue na fila. */
  expired: boolean;
  dayLabel: string;
  /** (professionalId, dateStr) identificam a fila - o app usa pra "sair da fila". */
  professionalId: string;
  dateStr: string;
  professionalName: string | null;
  serviceName: string;
  tenantName: string;
  slug: string;
  /** Horários livres do dia (todos, não só o que vagou). Vazio se expirada. */
  slots: { startsAtIso: string; label: string }[];
  /** Expiração da reserva (holdExpiresAt) - a tela conta o timer até aqui. */
  holdExpiresAtIso: string;
  /** Janela de confirmação do tenant (waitlistWindowMinutes) em segundos - rótulo do timer. */
  confirmWindowSeconds: number;
  /** Preço do serviço formatado (ex.: "R$ 55"), pra mostrar o que se está confirmando. */
  priceLabel: string | null;
};

/** Dados da tela de confirmação: todos os horários livres do dia + contexto. */
export async function getWaitlistOfferView(
  offerId: string,
  entryId: string,
  now: Date,
): Promise<WaitlistOfferView | null> {
  const offer = await prisma.waitlistOffer.findUnique({ where: { id: offerId } });
  if (!offer) return null;

  const entry = await prisma.waitlistEntry.findUnique({
    where: { id: entryId },
    include: { service: { select: { durationMinutes: true, name: true, priceCents: true } } },
  });
  if (
    !entry ||
    entry.tenantId !== offer.tenantId ||
    entry.professionalId !== offer.professionalId ||
    dateStrOf(entry.date) !== dateStrOf(offer.date)
  ) {
    return null;
  }

  const [tenant, pro] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: offer.tenantId },
      select: { timezone: true, name: true, slug: true, waitlistWindowMinutes: true },
    }),
    prisma.user.findUnique({ where: { id: offer.professionalId }, select: { name: true } }),
  ]);
  if (!tenant) return null;

  const dateStr = dateStrOf(offer.date);
  const expired = offer.status !== 'ACTIVE' || offer.holdExpiresAt <= now;
  const slots = expired
    ? []
    : (
        await getServiceDaySlots({
          tenantId: offer.tenantId,
          serviceId: entry.serviceId,
          tz: tenant.timezone,
          durationMinutes: entry.service.durationMinutes,
          dateStr,
          now,
          professionalId: offer.professionalId,
        })
      ).map((s) => ({ startsAtIso: s.startsAtIso, label: s.label }));

  return {
    offerId,
    entryId,
    expired,
    dayLabel: dayLabel(dateStr, tenant.timezone),
    professionalId: offer.professionalId,
    dateStr,
    professionalName: pro?.name ?? null,
    serviceName: entry.service.name,
    tenantName: tenant.name,
    slug: tenant.slug,
    slots,
    holdExpiresAtIso: offer.holdExpiresAt.toISOString(),
    confirmWindowSeconds: tenant.waitlistWindowMinutes * 60,
    priceLabel: entry.service.priceCents > 0 ? formatBRL(entry.service.priceCents) : null,
  };
}

// --- Sair da fila ------------------------------------------------------------

/**
 * Sai da fila (web/app): cancela as inscrições WAITING da conta logada pra (tenant, pro,
 * dia). Só mexe nas entries do próprio cliente; não toca offers/reserva (a entry cancelada
 * simplesmente não entra nas próximas ondas). Idempotente.
 */
export async function leaveWaitlist(args: {
  slug: string;
  professionalId: string;
  dateStr: string;
  accountId: string;
}): Promise<{ ok: true } | { error: string }> {
  const { slug, professionalId, dateStr, accountId } = args;
  const tenant = await prisma.tenant.findUnique({ where: { slug }, select: { id: true } });
  if (!tenant) return { error: 'Estabelecimento não encontrado' };
  await prisma.waitlistEntry.updateMany({
    where: {
      tenantId: tenant.id,
      professionalId,
      date: dbDate(dateStr),
      status: 'WAITING',
      contact: { customerAccountId: accountId },
    },
    data: { status: 'CANCELED' },
  });
  return { ok: true };
}

// --- "Meus interesses" (as filas da conta) -----------------------------------

/** Posição 1-based na fila (tenant, pro, dia) - ordem por createdAt (= ordem das ondas). */
export async function getEntryPosition(entryId: string): Promise<number> {
  const entry = await prisma.waitlistEntry.findUnique({
    where: { id: entryId },
    select: { tenantId: true, professionalId: true, date: true, createdAt: true },
  });
  if (!entry) return 1;
  const ahead = await prisma.waitlistEntry.count({
    where: {
      tenantId: entry.tenantId,
      professionalId: entry.professionalId,
      date: entry.date,
      status: 'WAITING',
      createdAt: { lt: entry.createdAt },
    },
  });
  return ahead + 1;
}

export type CustomerWaitlistEntry = {
  entryId: string;
  tenantName: string;
  tenantSlug: string;
  logoUrl: string | null;
  serviceName: string;
  professionalId: string;
  professionalName: string | null;
  dateStr: string;
  dayLabel: string;
  position: number;
  /** Presente quando há uma vaga aberta esperando ESTA inscrição (surface in-app). */
  offer: { offerId: string; slotsCount: number } | null;
};

/**
 * Todas as filas WAITING de uma conta (dias/estabelecimentos diferentes), com posição e,
 * quando há vaga aberta pra ela, o offer + nº de horários livres. Read puro (app "Meus
 * interesses"). O nº de filas por cliente é pequeno; a posição é uma contagem por entry.
 */
export async function getCustomerWaitlistEntries(
  accountId: string,
  now: Date,
): Promise<CustomerWaitlistEntry[]> {
  const entries = await prisma.waitlistEntry.findMany({
    where: { status: 'WAITING', contact: { customerAccountId: accountId } },
    orderBy: { createdAt: 'asc' },
    include: {
      tenant: { select: { name: true, slug: true, logoUrl: true, timezone: true } },
      professional: { select: { name: true } },
      service: { select: { name: true, durationMinutes: true } },
    },
  });
  if (entries.length === 0) return [];

  // Ofertas ativas que tocam esses (tenant, pro, dia) - pra marcar "vaga aberta".
  const activeOffers = await prisma.waitlistOffer.findMany({
    where: {
      status: 'ACTIVE',
      holdExpiresAt: { gt: now },
      OR: entries.map((e) => ({
        tenantId: e.tenantId,
        professionalId: e.professionalId,
        date: e.date,
      })),
    },
  });

  const out: CustomerWaitlistEntry[] = [];
  for (const e of entries) {
    const dateStr = dateStrOf(e.date);
    const ahead = await prisma.waitlistEntry.count({
      where: {
        tenantId: e.tenantId,
        professionalId: e.professionalId,
        date: e.date,
        status: 'WAITING',
        createdAt: { lt: e.createdAt },
      },
    });
    // Oferta que notificou ESTA inscrição = vaga aberta esperando este cliente.
    const offer = activeOffers.find(
      (o) =>
        o.tenantId === e.tenantId &&
        o.professionalId === e.professionalId &&
        dateStrOf(o.date) === dateStr &&
        o.notifiedEntryIds.includes(e.id),
    );
    let offerInfo: { offerId: string; slotsCount: number } | null = null;
    if (offer) {
      const slots = await getServiceDaySlots({
        tenantId: e.tenantId,
        serviceId: e.serviceId,
        tz: e.tenant.timezone,
        durationMinutes: e.service.durationMinutes,
        dateStr,
        now,
        professionalId: e.professionalId,
      });
      offerInfo = { offerId: offer.id, slotsCount: slots.length };
    }
    out.push({
      entryId: e.id,
      tenantName: e.tenant.name,
      tenantSlug: e.tenant.slug,
      logoUrl: e.tenant.logoUrl,
      serviceName: e.service.name,
      professionalId: e.professionalId,
      professionalName: e.professional.name,
      dateStr,
      dayLabel: dayLabel(dateStr, e.tenant.timezone),
      position: ahead + 1,
      offer: offerInfo,
    });
  }
  return out;
}

// --- Métricas (on-read, pro painel do dono) ----------------------------------

/** Vagas recuperadas pela fila num período: quantas + receita (soma dos preços). */
export async function getRecoveredStats(
  tenantId: string,
  range: { from: Date; to: Date },
): Promise<{ count: number; revenueCents: number }> {
  const appts = await prisma.appointment.findMany({
    where: {
      tenantId,
      fromWaitlist: true,
      status: { not: 'CANCELED' },
      createdAt: { gte: range.from, lte: range.to },
    },
    select: { service: { select: { priceCents: true } } },
  });
  return {
    count: appts.length,
    revenueCents: appts.reduce((sum, a) => sum + a.service.priceCents, 0),
  };
}

/** Pressão da fila: (profissional, dia) com N+ pessoas esperando - insight "considere abrir". */
export async function getWaitlistPressure(
  tenantId: string,
  opts?: { minCount?: number; now?: Date },
): Promise<{ professionalId: string; date: string; count: number }[]> {
  const minCount = opts?.minCount ?? 3;
  const now = opts?.now ?? new Date();
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { timezone: true },
  });
  const fromDate = dbDate(isoDateInTz(now, tenant?.timezone ?? 'America/Sao_Paulo'));

  const rows = await prisma.waitlistEntry.groupBy({
    by: ['professionalId', 'date'],
    where: { tenantId, status: 'WAITING', date: { gte: fromDate } },
    _count: { _all: true },
  });

  return rows
    .filter((r) => r._count._all >= minCount)
    .map((r) => ({
      professionalId: r.professionalId,
      date: dateStrOf(r.date),
      count: r._count._all,
    }))
    .sort((a, b) => b.count - a.count);
}

// --- Notificações (helpers internos) -----------------------------------------

type TenantCtx = { timezone: string; name: string; slug: string };

/** Push "abriu horário" (app) OU WhatsApp pela plataforma (sem app) - por entry da onda. */
async function notifyWave(
  offerId: string,
  tenantId: string,
  professionalId: string,
  dateStr: string,
  tenant: TenantCtx,
  entryIds: string[],
): Promise<void> {
  if (entryIds.length === 0) return;

  const [pro, entries] = await Promise.all([
    prisma.user.findUnique({ where: { id: professionalId }, select: { name: true } }),
    prisma.waitlistEntry.findMany({
      where: { id: { in: entryIds } },
      include: { contact: { include: { customerAccount: { include: { pushDevices: true } } } } },
    }),
  ]);
  const proName = pro?.name ?? 'profissional';
  const label = dayLabel(dateStr, tenant.timezone);
  const link = `${appUrl()}/${tenant.slug}/fila/${offerId}`;

  for (const entry of entries) {
    const contact = entry.contact;
    const name = contact.name ?? contact.customerAccount?.name ?? 'cliente';
    const devices = contact.customerAccount?.pushDevices ?? [];

    if (devices.length > 0) {
      await sendPushSafe(
        devices.map((d) => d.expoPushToken),
        {
          title: `Abriu horário ${label}`,
          body: `Com o ${proName}. Você tem alguns minutos pra garantir.`,
          data: { type: 'waitlist_offer', offerId, entryId: entry.id, slug: tenant.slug },
        },
      );
      continue; // tem app: push basta
    }
    if (contact.phone) {
      await sendPlatformWhatsapp(contact.phone, process.env.WHATSAPP_TEMPLATE_WAITLIST_OPENING, [
        name,
        label,
        proName,
        tenant.name,
        `${link}?e=${entry.id}`,
      ]);
    }
  }
}

/** Push "entrou na fila" (só push - sem app, silencioso; o WhatsApp fica pro "abriu"). */
async function notifyClientJoined(
  entryId: string,
  tz: string,
  professionalId: string,
  dateStr: string,
): Promise<void> {
  const entry = await prisma.waitlistEntry.findUnique({
    where: { id: entryId },
    include: { contact: { include: { customerAccount: { include: { pushDevices: true } } } } },
  });
  const devices = entry?.contact.customerAccount?.pushDevices ?? [];
  if (devices.length === 0) return;

  const pro = await prisma.user.findUnique({
    where: { id: professionalId },
    select: { name: true },
  });
  const label = dayLabel(dateStr, tz);
  await sendPushSafe(
    devices.map((d) => d.expoPushToken),
    {
      title: 'Você está na fila',
      body: `${label} com o ${pro?.name ?? 'profissional'}. A gente avisa se abrir.`,
      data: { type: 'waitlist_joined' },
    },
  );
}

/** Push/WhatsApp "Fechado!" ao cliente que confirmou. */
async function notifyClientConfirmed(
  contactId: string,
  professionalId: string,
  tz: string,
  startsAt: Date,
): Promise<void> {
  const [contact, pro] = await Promise.all([
    prisma.contact.findUnique({
      where: { id: contactId },
      include: { customerAccount: { include: { pushDevices: true } } },
    }),
    prisma.user.findUnique({ where: { id: professionalId }, select: { name: true } }),
  ]);
  if (!contact) return;
  const proName = pro?.name ?? 'profissional';
  const when = formatWhen(startsAt, tz);
  const devices = contact.customerAccount?.pushDevices ?? [];

  if (devices.length > 0) {
    await sendPushSafe(
      devices.map((d) => d.expoPushToken),
      {
        title: 'Vaga garantida!',
        body: `${when} com o ${proName}.`,
        data: { type: 'waitlist_confirmed' },
      },
    );
    return;
  }
  if (contact.phone) {
    const name = contact.name ?? contact.customerAccount?.name ?? 'cliente';
    await sendPlatformWhatsapp(contact.phone, process.env.WHATSAPP_TEMPLATE_WAITLIST_CONFIRMED, [
      name,
      when,
      proName,
    ]);
  }
}

/** Notificação in-app do dono: vaga recuperada automaticamente. */
async function notifyOwnerRecovered(
  tenantId: string,
  serviceId: string,
  professionalId: string,
  tz: string,
  startsAt: Date,
): Promise<void> {
  const [service, pro] = await Promise.all([
    prisma.service.findUnique({
      where: { id: serviceId },
      select: { name: true, priceCents: true },
    }),
    prisma.user.findUnique({ where: { id: professionalId }, select: { name: true } }),
  ]);
  const when = formatWhen(startsAt, tz);
  const parts = [when, pro?.name, service ? formatBRL(service.priceCents) : null].filter(Boolean);
  await createNotification(tenantId, 'ACCOUNT', 'waitlist.filled', {
    title: 'Vaga recuperada pela fila',
    body: `Uma vaga cancelada foi preenchida automaticamente. ${parts.join(', ')}.`,
    ctaLabel: 'Ver agenda',
    ctaHref: '/appointments',
  });
}

/** "sáb, 11/07 às 15:30" no fuso do tenant. */
function formatWhen(date: Date, tz: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: tz,
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
