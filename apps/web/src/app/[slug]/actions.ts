'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { type AppointmentStatus, prisma } from '@haru/database';

import { createBookingCore } from '@/lib/appointment-mutations';
import { createAppointmentSeries } from '@/lib/appointment-series';
import { type AvailableSlotWithProfessionals, localWallTimeToUtc } from '@/lib/availability';
import { BOOKING_HORIZON_DAYS, isoDateInTz } from '@/lib/booking-days';
import { getCustomerAccount } from '@/lib/customer-auth';
import { normalizePhoneBR } from '@/lib/format';
import { notifyAppointmentCreated } from '@/lib/notify';
import { getServiceDaySlots, resolveBookingProfessional } from '@/lib/professionals';

import { loadPublicTenant } from './_tenant';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Dia "YYYY-MM-DD" de hoje no fuso `tz` (pra rejeitar datas no passado). */
function todayInTz(tz: string): string {
  // en-CA dá direto o formato ISO YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** Dia "YYYY-MM-DD" de um instante UTC, lido no fuso `tz`. */
function dateStrInTz(date: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Horários livres pra um serviço num dia - chamado sob demanda pelo client quando
 * o cliente escolhe serviço + dia. Rota pública: NÃO usa requireUserAndTenant.
 */
export async function getAvailableSlots(
  slug: string,
  serviceId: string,
  dateStr: string,
  professionalId?: string,
): Promise<AvailableSlotWithProfessionals[]> {
  if (!DATE_RE.test(dateStr)) return [];

  const tenant = await loadPublicTenant(slug);
  if (!tenant || !tenant.publicBookingEnabled) return [];

  // Janela permitida: nem no passado, nem além do horizonte de agendamento. Este é
  // o gate de verdade (o client só sugere datas; aqui não confiamos no que veio).
  if (dateStr < todayInTz(tenant.timezone)) return [];
  const maxDate = isoDateInTz(
    new Date(Date.now() + (BOOKING_HORIZON_DAYS - 1) * 86_400_000),
    tenant.timezone,
  );
  if (dateStr > maxDate) return [];

  const service = tenant.services.find((s) => s.id === serviceId && s.active);
  if (!service) return [];

  // Disponibilidade por profissional: todos que atendem o serviço (ou só o
  // escolhido). Cada slot traz quem está livre nele.
  return getServiceDaySlots({
    tenantId: tenant.id,
    serviceId,
    tz: tenant.timezone,
    durationMinutes: service.durationMinutes,
    dateStr,
    now: new Date(),
    professionalId: professionalId || undefined,
  });
}

const PHONE_RE = /^55\d{10,11}$/;

export type ContactLookupResult = { exists: boolean; name: string | null };

/**
 * Consulta, pelo telefone, se já existe um cadastro completo neste tenant - usado
 * pelo passo de contato do agendamento público pra pular o campo "nome" de quem
 * já é cliente. Retorna SÓ { exists, name } (o nome é dado que o próprio cliente
 * forneceu); nunca expõe email, nascimento, histórico ou existência de cadastro
 * incompleto. Rota pública: sem auth, mas mínima superfície de dados.
 */
export async function lookupContact(slug: string, phone: string): Promise<ContactLookupResult> {
  // Normaliza pra E.164 (mesmo formato que o bot grava no banco) antes de buscar -
  // senão o número nacional "11914092346" nunca casa com o "5511914092346" salvo.
  const e164 = normalizePhoneBR(phone);
  if (!PHONE_RE.test(e164)) return { exists: false, name: null };

  const tenant = await loadPublicTenant(slug);
  if (!tenant || !tenant.publicBookingEnabled) return { exists: false, name: null };

  const contact = await prisma.contact.findUnique({
    where: { tenantId_phone: { tenantId: tenant.id, phone: e164 } },
    select: { name: true, profileCompletedAt: true },
  });

  // Só considera "cadastrado" quem completou o cadastro (mesmo gate do bot) e tem
  // nome - senão ainda precisamos pedir o nome.
  if (!contact || !contact.profileCompletedAt || !contact.name) {
    return { exists: false, name: null };
  }
  return { exists: true, name: contact.name };
}

const bookingSchema = z.object({
  slug: z.string().min(1),
  serviceId: z.string().min(1, 'Selecione um serviço'),
  // Profissional escolhido. '' / ausente = sem preferência (sistema atribui).
  professionalId: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : undefined)),
  slotIso: z
    .string()
    .min(1, 'Selecione um horário')
    .transform((v) => new Date(v))
    .refine((d) => !Number.isNaN(d.getTime()), { message: 'Horário inválido' })
    .refine((d) => d > new Date(), { message: 'Esse horário já passou' }),
  name: z
    .string()
    .min(2, 'Informe seu nome')
    .max(80, 'Nome muito longo')
    .transform((v) => v.trim()),
  phone: z
    .string()
    .min(8, 'Informe seu WhatsApp')
    // Normaliza pra E.164 (mesmo formato do banco/bot) - o contato criado pelo site
    // precisa casar com o que o bot grava, senão vira um cadastro duplicado.
    .transform(normalizePhoneBR)
    .refine((v) => /^55\d{10,11}$/.test(v), { message: 'WhatsApp inválido - confira o DDD' }),
  // Recorrência (opcional). 'NONE'/ausente = agendamento avulso.
  frequency: z.enum(['NONE', 'WEEKLY', 'BIWEEKLY', 'MONTHLY']).default('NONE'),
  occurrences: z.coerce.number().int().min(2).max(12).optional(),
});

export type CreatePublicBookingResult =
  | { error: string }
  | {
      ok: true;
      status: AppointmentStatus;
      summary: string;
      appointmentId: string;
      /** Mostra o bloco "Pagar agora" na tela de sucesso. */
      paymentAvailable: boolean;
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
    }
  | undefined;

/**
 * Cria um agendamento a partir do formulário público. Rota pública (sem auth):
 * toda a confiança vem da revalidação server-side - o slot é recalculado e o
 * conflito re-checado, então não confiamos no que o client mandou.
 */
export async function createPublicBooking(
  _prev: CreatePublicBookingResult,
  formData: FormData,
): Promise<CreatePublicBookingResult> {
  const parsed = bookingSchema.safeParse({
    slug: formData.get('slug'),
    serviceId: formData.get('serviceId'),
    professionalId: formData.get('professionalId') ?? undefined,
    slotIso: formData.get('slotIso'),
    name: formData.get('name'),
    phone: formData.get('phone'),
    frequency: formData.get('frequency') ?? 'NONE',
    occurrences: formData.get('occurrences') ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }
  const { slug, serviceId, slotIso, name, phone, frequency } = parsed.data;

  const tenant = await loadPublicTenant(slug);
  if (!tenant || !tenant.publicBookingEnabled) {
    return { error: 'Agendamento online indisponível no momento' };
  }

  const service = tenant.services.find((s) => s.id === serviceId && s.active);
  if (!service) return { error: 'Serviço não encontrado' };

  const startsAt = slotIso;

  // Revalida o slot no servidor E resolve o profissional. resolveBookingProfessional
  // recalcula os slots livres (expediente + grade + sem-colisão) do profissional
  // escolhido (ou, "sem preferência", do primeiro livre por ordem de nome) - de uma
  // vez garante que o horário é válido e atribui quem atende, sem confiar no client.
  const dateStr = dateStrInTz(startsAt, tenant.timezone);
  const resolved = await resolveBookingProfessional({
    tenantId: tenant.id,
    serviceId,
    tz: tenant.timezone,
    durationMinutes: service.durationMinutes,
    startsAt,
    dateStr,
    now: new Date(),
    requestedProfessionalId: parsed.data.professionalId,
  });
  if (!resolved.ok) {
    return { error: resolved.reason };
  }
  const professionalId = resolved.professionalId;

  // Mitigação leve de spam: um mesmo telefone não acumula vários pedidos ativos
  // no mesmo dia (sem rate-limit por IP, que exigiria Redis).
  const sameDayStart = localWallTimeToUtc(dateStr, 0, tenant.timezone);
  const sameDayEnd = localWallTimeToUtc(dateStr, 24 * 60, tenant.timezone);
  const existingSameDay = await prisma.appointment.findFirst({
    where: {
      tenantId: tenant.id,
      contact: { phone },
      status: { in: ['PENDING', 'CONFIRMED'] },
      startsAt: { gte: sameDayStart, lt: sameDayEnd },
    },
  });
  if (existingSameDay) {
    return { error: 'Você já tem um agendamento ativo nesse dia. Fale conosco pra ajustar.' };
  }

  // Upsert do contato preservando profileCompletedAt já existente (gate do bot).
  const existing = await prisma.contact.findUnique({
    where: { tenantId_phone: { tenantId: tenant.id, phone } },
    select: { profileCompletedAt: true },
  });
  const contact = await prisma.contact.upsert({
    where: { tenantId_phone: { tenantId: tenant.id, phone } },
    update: { name, profileCompletedAt: existing?.profileCompletedAt ?? new Date() },
    create: { tenantId: tenant.id, phone, name, profileCompletedAt: new Date() },
  });

  // Se um cliente logado está agendando com o PRÓPRIO número (o telefone verificado
  // da conta), vincula este contato a ela. Só com telefone igual ao da conta - senão
  // alguém logado agendaria com número alheio e reivindicaria o histórico de terceiros.
  const account = await getCustomerAccount();
  if (account && account.phone === phone) {
    await prisma.contact.updateMany({
      where: { id: contact.id, customerAccountId: null },
      data: { customerAccountId: account.id },
    });
  }

  // publicBookingConfirmation (PENDING|CONFIRMED) é subconjunto de AppointmentStatus.
  const status = tenant.publicBookingConfirmation as unknown as AppointmentStatus;

  const whenFirst = new Intl.DateTimeFormat('pt-BR', {
    timeZone: tenant.timezone,
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(startsAt);

  // --- Agendamento recorrente: cria a série (pula ocorrências ocupadas/fora do
  // expediente e avisa). Não oferece pagamento online nesta versão (cobrança de
  // série fica fora de escopo).
  if (frequency !== 'NONE') {
    if (!parsed.data.occurrences) {
      return { error: 'Escolha quantas vezes o agendamento se repete' };
    }
    // Série fica com o profissional resolvido (fixo) e valida cada ocorrência
    // contra a grade DELE.
    const professionalBlocks = tenant.scheduleBlocks.filter(
      (b) => b.professionalId === professionalId,
    );
    const result = await createAppointmentSeries({
      tenantId: tenant.id,
      contactId: contact.id,
      serviceId: service.id,
      durationMinutes: service.durationMinutes,
      tz: tenant.timezone,
      frequency,
      occurrences: parsed.data.occurrences,
      firstStartsAtIso: startsAt.toISOString(),
      status,
      professionalId,
      blocks: professionalBlocks,
    });

    if (result.createdIds.length === 0) {
      return { error: 'Nenhum horário da série está livre. Escolha outro horário inicial.' };
    }

    notifyAppointmentCreated(result.createdIds[0]).catch((err) =>
      console.error('[public-booking] notify create (series) failed', err),
    );

    revalidatePath(`/${slug}`);
    revalidatePath('/appointments');
    revalidatePath('/dashboard');

    return {
      ok: true,
      series: true,
      status,
      summary: `${service.name} · ${whenFirst}`,
      createdCount: result.createdIds.length,
      skipped: result.skipped,
      beyondHorizon: result.beyondHorizon,
    };
  }

  // Cria o agendamento avulso (o core re-checa conflito por profissional e dispara
  // o webhook de criação).
  const created = await createBookingCore({
    tenantId: tenant.id,
    contactId: contact.id,
    serviceId: service.id,
    professionalId,
    startsAt,
    durationMinutes: service.durationMinutes,
    status,
  });
  if ('error' in created) {
    return { error: created.error };
  }

  // Revalida a página pública (e o painel, ainda que o dono possa não estar logado).
  revalidatePath(`/${slug}`);
  revalidatePath('/appointments');
  revalidatePath('/dashboard');

  const when = new Intl.DateTimeFormat('pt-BR', {
    timeZone: tenant.timezone,
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(startsAt);

  const paymentAvailable = service.priceCents > 0 && tenant.paymentProvider !== null;

  return {
    ok: true,
    status,
    summary: `${service.name} · ${when}`,
    appointmentId: created.appointmentId,
    paymentAvailable,
  };
}
