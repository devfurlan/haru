// Booking público (agendar do zero num tenant) para o app mobile. Espelha o caminho
// AVULSO de createPublicBooking / getAvailableSlots em app/[slug]/actions.ts (que são
// 'use server' e acoplados a FormData/cookies). Aqui é lib pura, importável pelos route
// handlers. Se mudar a regra de booking no web, refletir aqui (e vice-versa).

import {
  type AppointmentStatus,
  type CustomerAccount,
  prisma,
  type RecurrenceFrequency,
} from '@haru/database';

import {
  BOOKING_HORIZON_DAYS,
  isoDateInTz,
  localWallTimeToUtc,
  normalizePhoneBR,
  type AvailableSlotWithProfessionals,
} from '@haru/shared';

import { hasServiceSubscriptions, hasWaitlist } from '@haru/billing';

import { loadPublicTenant } from '@/app/[slug]/_tenant';
import { createAppointmentSeries } from '@/lib/appointment-series';
import { createBookingCore } from '@/lib/appointment-mutations';
import { notifyAppointmentCreated } from '@/lib/notify';
import { getServiceDaySlots, resolveBookingProfessional } from '@/lib/professionals';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PHONE_RE = /^55\d{10,11}$/;

export type PublicTenantData = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  logoUrl: string | null;
  publicBookingEnabled: boolean;
  /** Fila de espera ligada: habilita o CTA "me avisa se abrir" em dia lotado. */
  waitlistEnabled: boolean;
  /** Até quantos dias adiante o agendamento é oferecido. */
  horizonDays: number;
  /** Dias-da-semana com expediente (0=dom..6=sáb), pro carrossel de datas. */
  openWeekdays: number[];
  services: {
    id: string;
    name: string;
    description: string | null;
    durationMinutes: number;
    priceCents: number;
    /** IDs dos profissionais que atendem este serviço. */
    professionalIds: string[];
  }[];
  professionals: { id: string; name: string | null; avatarUrl: string | null }[];
  /**
   * Planos do Clube (assinatura de serviços) ATIVOS, pra vitrine na página do
   * estabelecimento. Vazio quando o dono não tem a feature (Time+) ou não criou plano - o
   * bloco de assinatura só aparece com plano. Preço/crédito em snapshot da composição viva.
   */
  membershipPlans: {
    id: string;
    name: string;
    description: string | null;
    priceCents: number;
    creditsPerCycle: number;
    creditRollover: boolean;
    rolloverCap: number | null;
    /** Serviços cobertos pelo plano (pra casar com o serviço no agendamento). */
    serviceIds: string[];
  }[];
};

/** Dados públicos do tenant pro app (serviços ativos, profissionais, dias de expediente). */
export async function getPublicTenantData(slug: string): Promise<PublicTenantData | null> {
  const tenant = await loadPublicTenant(slug);
  if (!tenant) return null;
  const openWeekdays = [...new Set(tenant.scheduleBlocks.map((b) => b.weekday))].sort(
    (a, b) => a - b,
  );
  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    timezone: tenant.timezone,
    logoUrl: tenant.logoUrl,
    publicBookingEnabled: tenant.publicBookingEnabled,
    // Flag efetivo: fila só aparece pros fronts se o dono ligou E o plano é Time+ (Solo não tem).
    waitlistEnabled: tenant.waitlistEnabled && hasWaitlist(tenant.subscription),
    horizonDays: BOOKING_HORIZON_DAYS,
    openWeekdays,
    services: tenant.services.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      durationMinutes: s.durationMinutes,
      priceCents: s.priceCents,
      professionalIds: s.professionals.map((p) => p.professionalId),
    })),
    professionals: tenant.users.map((u) => ({ id: u.id, name: u.name, avatarUrl: u.avatarUrl })),
    // Gate NÃO-BURLÁVEL: assinatura é feature Time+ do DONO. Downgrade some com a vitrine.
    membershipPlans: hasServiceSubscriptions(tenant.subscription)
      ? tenant.membershipPlans.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          priceCents: p.priceCents,
          creditsPerCycle: p.creditsPerCycle,
          creditRollover: p.creditRollover,
          rolloverCap: p.rolloverCap,
          serviceIds: p.services.map((s) => s.serviceId),
        }))
      : [],
  };
}

/** Horários livres pra um serviço num dia (mesma janela e gate do web). */
export async function getPublicSlots(
  slug: string,
  serviceId: string,
  dateStr: string,
  professionalId?: string,
): Promise<AvailableSlotWithProfessionals[]> {
  if (!DATE_RE.test(dateStr)) return [];
  const tenant = await loadPublicTenant(slug);
  if (!tenant || !tenant.publicBookingEnabled) return [];
  if (dateStr < isoDateInTz(new Date(), tenant.timezone)) return [];
  const maxDate = isoDateInTz(
    new Date(Date.now() + (BOOKING_HORIZON_DAYS - 1) * 86_400_000),
    tenant.timezone,
  );
  if (dateStr > maxDate) return [];
  const service = tenant.services.find((s) => s.id === serviceId && s.active);
  if (!service) return [];
  return getServiceDaySlots({
    tenantId: tenant.id,
    serviceId,
    tz: tenant.timezone,
    durationMinutes: service.durationMinutes,
    dateStr,
    now: new Date(),
    professionalId: professionalId || undefined,
    includeBusy: true, // app mostra horários ocupados riscados (design 10)
  });
}

export type PublicBookingResult =
  | { error: string }
  | {
      ok: true;
      status: AppointmentStatus;
      summary: string;
      appointmentId: string;
      paymentAvailable: boolean;
      /** Agendamento coberto por crédito de assinatura (não gera cobrança). */
      coveredBySubscription: boolean;
      /** Assinatura que cobriu (plano + saldo restante), pra tela de sucesso. null = avulso. */
      membership: { planName: string; remainingCredits: number } | null;
    }
  | {
      ok: true;
      series: true;
      status: AppointmentStatus;
      /** Resumo da 1ª ocorrência (serviço · dia/hora). */
      summary: string;
      createdCount: number;
      /** ISOs (UTC) das ocorrências puladas por conflito/expediente. */
      skipped: string[];
      beyondHorizon: number;
    };

/**
 * Resolve o Contact (todo Appointment/WaitlistEntry aponta pra um) a partir de nome +
 * WhatsApp opcional + conta logada. Com telefone: upsert por (tenant, phone) preservando
 * profileCompletedAt (gate do bot) e, se a conta logada tem o mesmo número (verificado, ou
 * o contato acabou de nascer), reivindica o contato pra a conta. Sem telefone: reusa o
 * Contact já ligado à conta neste tenant, senão cria um phoneless vinculado. Pressupõe que
 * o caller já validou (phone válido OU account presente).
 *
 * ponytail: find-or-create em app no ramo phoneless (não há unique (tenantId,
 * customerAccountId)); corrida sob chamadas concorrentes fica com os guards do caller.
 */
export async function resolvePublicContactId(args: {
  tenantId: string;
  name: string;
  /** E.164 já normalizado, ou '' (sem número → exige account). */
  phone: string;
  account: CustomerAccount | null;
}): Promise<string> {
  const { tenantId, name, phone, account } = args;
  if (phone) {
    const existing = await prisma.contact.findUnique({
      where: { tenantId_phone: { tenantId, phone } },
      select: { profileCompletedAt: true },
    });
    const contact = await prisma.contact.upsert({
      where: { tenantId_phone: { tenantId, phone } },
      update: { name, profileCompletedAt: existing?.profileCompletedAt ?? new Date() },
      create: { tenantId, phone, name, profileCompletedAt: new Date() },
    });
    if (account) {
      const ownNumber = account.phone === phone || (!existing && account.pendingPhone === phone);
      if (ownNumber) {
        await prisma.contact.updateMany({
          where: { id: contact.id, customerAccountId: null },
          data: { customerAccountId: account.id },
        });
      }
    }
    return contact.id;
  }

  const acc = account!;
  const linked = await prisma.contact.findFirst({
    where: { tenantId, customerAccountId: acc.id },
    select: { id: true, profileCompletedAt: true },
  });
  if (linked) {
    await prisma.contact.update({
      where: { id: linked.id },
      data: { name, profileCompletedAt: linked.profileCompletedAt ?? new Date() },
    });
    return linked.id;
  }
  const created = await prisma.contact.create({
    data: {
      tenantId,
      phone: null,
      name,
      customerAccountId: acc.id,
      profileCompletedAt: new Date(),
    },
  });
  return created.id;
}

/**
 * Cria um agendamento a partir do app. Revalida o slot no servidor, resolve o
 * profissional, aplica o anti-spam por telefone/dia e faz o upsert do contato. Se
 * `account` estiver logado e com o MESMO telefone verificado, vincula o contato à conta.
 * Com `recurrence`, cria uma SÉRIE (semanal/quinzenal/mensal) em vez de avulso - espelha
 * o ramo de série de app/[slug]/actions.ts.
 */
export async function createSinglePublicBooking(input: {
  slug: string;
  serviceId: string;
  professionalId?: string;
  startsAt: Date;
  name: string;
  /** WhatsApp opcional (''/undefined = sem número; exige conta logada). */
  phone?: string;
  account: CustomerAccount | null;
  /** Recorrência opcional. Ausente = agendamento avulso (comportamento atual). */
  recurrence?: {
    frequency: RecurrenceFrequency;
    occurrences: number;
    /** Ocorrências escolhidas na prévia editável (ISO UTC, inclui a 1ª). */
    occurrenceIsos?: string[];
  };
}): Promise<PublicBookingResult> {
  const tenant = await loadPublicTenant(input.slug);
  if (!tenant || !tenant.publicBookingEnabled) {
    return { error: 'Agendamento online indisponível no momento' };
  }
  const service = tenant.services.find((s) => s.id === input.serviceId && s.active);
  if (!service) return { error: 'Serviço não encontrado' };

  const name = input.name.trim();
  if (name.length < 2) return { error: 'Informe seu nome' };
  // WhatsApp opcional: sem número, o cliente precisa estar logado (identidade vem da conta).
  const phone = input.phone ? normalizePhoneBR(input.phone) : '';
  if (phone && !PHONE_RE.test(phone)) return { error: 'WhatsApp inválido - confira o DDD' };
  if (!phone && !input.account) return { error: 'Entre na sua conta pra agendar.' };

  const startsAt = input.startsAt;
  if (Number.isNaN(startsAt.getTime()) || startsAt <= new Date()) {
    return { error: 'Esse horário já passou' };
  }
  const dateStr = isoDateInTz(startsAt, tenant.timezone);

  const resolved = await resolveBookingProfessional({
    tenantId: tenant.id,
    serviceId: service.id,
    tz: tenant.timezone,
    durationMinutes: service.durationMinutes,
    startsAt,
    dateStr,
    now: new Date(),
    requestedProfessionalId: input.professionalId,
  });
  if (!resolved.ok) return { error: resolved.reason };
  const professionalId = resolved.professionalId;

  // Anti-spam leve: um mesmo cliente não acumula vários pedidos ativos no mesmo dia.
  // Ancorado no telefone quando há; senão na conta logada.
  const sameDayStart = localWallTimeToUtc(dateStr, 0, tenant.timezone);
  const sameDayEnd = localWallTimeToUtc(dateStr, 24 * 60, tenant.timezone);
  const existingSameDay = await prisma.appointment.findFirst({
    where: {
      tenantId: tenant.id,
      contact: phone ? { phone } : { customerAccountId: input.account!.id },
      status: { in: ['PENDING', 'CONFIRMED'] },
      startsAt: { gte: sameDayStart, lt: sameDayEnd },
    },
  });
  if (existingSameDay) {
    return { error: 'Você já tem um agendamento ativo nesse dia. Fale conosco pra ajustar.' };
  }

  // Resolve o Contact (todo Appointment aponta pra um).
  const contactId = await resolvePublicContactId({
    tenantId: tenant.id,
    name,
    phone,
    account: input.account,
  });

  const status = tenant.publicBookingConfirmation as unknown as AppointmentStatus;

  const when = new Intl.DateTimeFormat('pt-BR', {
    timeZone: tenant.timezone,
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(startsAt);

  // Recorrência: cria a série (pula ocorrências ocupadas/fora do expediente e avisa).
  // A série fica com o profissional resolvido (fixo) e valida cada ocorrência contra a
  // grade DELE. Não oferece pagamento online (cobrança de série fora de escopo).
  if (input.recurrence) {
    const professionalBlocks = tenant.scheduleBlocks.filter(
      (b) => b.professionalId === professionalId,
    );
    const result = await createAppointmentSeries({
      tenantId: tenant.id,
      contactId,
      serviceId: service.id,
      durationMinutes: service.durationMinutes,
      tz: tenant.timezone,
      frequency: input.recurrence.frequency,
      occurrences: input.recurrence.occurrences,
      firstStartsAtIso: startsAt.toISOString(),
      occurrenceIsos: input.recurrence.occurrenceIsos,
      status,
      professionalId,
      blocks: professionalBlocks,
    });
    if (result.createdIds.length === 0) {
      return { error: 'Nenhum horário da série está livre. Escolha outro horário inicial.' };
    }
    // A série não notifica sozinha (diferente do avulso, que notifica via createBookingCore).
    notifyAppointmentCreated(result.createdIds[0]).catch((err) =>
      console.error('[public-booking] notify create (series) failed', err),
    );
    return {
      ok: true,
      series: true,
      status,
      summary: `${service.name} · ${when}`,
      createdCount: result.createdIds.length,
      skipped: result.skipped,
      beyondHorizon: result.beyondHorizon,
    };
  }

  const created = await createBookingCore({
    tenantId: tenant.id,
    contactId,
    serviceId: service.id,
    professionalId,
    startsAt,
    durationMinutes: service.durationMinutes,
    status,
  });
  if ('error' in created) return { error: created.error };

  // Coberto por crédito de assinatura => sem cobrança (suprime o "Pagar agora").
  const paymentAvailable =
    !created.coveredBySubscription && service.priceCents > 0 && tenant.paymentProvider !== null;

  // Re-lê o plano+saldo da assinatura que cobriu (mesma ordem do consumo: currentPeriodEnd
  // asc), pro app mostrar "usou 1 crédito, restam N no {plano}". Contido no lib mobile - não
  // toca no createBookingCore compartilhado com o web.
  let membership: { planName: string; remainingCredits: number } | null = null;
  if (created.coveredBySubscription && input.account) {
    const m = await prisma.membership.findFirst({
      where: {
        tenantId: tenant.id,
        customerAccountId: input.account.id,
        plan: { services: { some: { serviceId: service.id } } },
        OR: [{ status: 'ACTIVE' }, { status: 'CANCELED', currentPeriodEnd: { gt: startsAt } }],
      },
      orderBy: { currentPeriodEnd: 'asc' },
      select: { planName: true, creditBalance: true },
    });
    if (m) membership = { planName: m.planName, remainingCredits: m.creditBalance };
  }

  return {
    ok: true,
    status,
    summary: `${service.name} · ${when}`,
    appointmentId: created.appointmentId,
    paymentAvailable,
    coveredBySubscription: created.coveredBySubscription,
    membership,
  };
}
