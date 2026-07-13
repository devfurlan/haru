'use server';

// Adapter da FILA DE ESPERA pro front da web pública: liga a UI (public-booking.tsx +
// fila/[offerId]) à engine real em [[waitlist.ts]]. A UI importa SÓ deste arquivo; aqui a
// gente traduz os tipos da engine pros que a UI espera. Regras de negócio (dia lotado +
// expediente aberto, ondas, reserva, timer) vivem na engine - ver [[project_waitlist_engine]].

import { prisma } from '@haru/database';

import { getCustomerAccount } from '@/lib/customer-auth';
import {
  checkWaitlistEligibility,
  confirmWaitlistSlot,
  getWaitlistOfferView,
  joinWaitlist,
  leaveWaitlist,
} from '@/lib/waitlist';
import { dbDate } from '@/lib/waitlist-core';

import { loadPublicTenant } from './_tenant';

// Posição na fila = ordem por createdAt (a engine notifica em ondas nessa ordem). Recebe a
// entry já carregada (o caller sempre a tem) - evita re-buscar e um fallback que mascarava
// entryId inválido como "1º".
async function positionOf(entry: {
  tenantId: string;
  professionalId: string;
  date: Date;
  createdAt: Date;
}): Promise<number> {
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

// ── Elegibilidade da fila no estado "sem horário" (dia+profissional) ──────────
export type QueueEligibility =
  | { state: 'open'; alreadyInQueue: false }
  | { state: 'open'; alreadyInQueue: true; position: number }
  // Expediente do dia terminou / profissional não atende nesse dia.
  | { state: 'closed' }
  // Fila desligada / não elegível / sem profissional escolhido (fila é por profissional).
  | { state: 'unavailable' };

export async function getQueueEligibility(input: {
  slug: string;
  serviceId: string;
  dateStr: string;
  professionalId?: string;
}): Promise<QueueEligibility> {
  // A fila é por (tenant, PROFISSIONAL, dia). Sem profissional concreto não dá pra oferecer.
  if (!input.professionalId) return { state: 'unavailable' };
  const tenant = await loadPublicTenant(input.slug);
  if (!tenant) return { state: 'unavailable' };

  const elig = await checkWaitlistEligibility({
    tenantId: tenant.id,
    professionalId: input.professionalId,
    serviceId: input.serviceId,
    dateStr: input.dateStr,
    now: new Date(),
  });
  if (!elig.eligible) {
    // Dia fechado (expediente encerrou / profissional não atende nesse dia) vs. indisponível
    // por outro motivo - decidido pelo CÓDIGO da elegibilidade, não pelo texto.
    return elig.code === 'expedienteOver' || elig.code === 'notWorking'
      ? { state: 'closed' }
      : { state: 'unavailable' };
  }

  // Elegível: se o cliente logado já está na fila desse dia+profissional, traz a posição.
  const account = await getCustomerAccount();
  if (account) {
    const entry = await prisma.waitlistEntry.findFirst({
      where: {
        tenantId: tenant.id,
        professionalId: input.professionalId,
        date: dbDate(input.dateStr),
        status: 'WAITING',
        contact: { customerAccountId: account.id },
      },
      select: { tenantId: true, professionalId: true, date: true, createdAt: true },
    });
    if (entry) return { state: 'open', alreadyInQueue: true, position: await positionOf(entry) };
  }
  return { state: 'open', alreadyInQueue: false };
}

// ── Entrar / sair da fila ─────────────────────────────────────────────────────
export type JoinQueueResult = { ok: true; position: number } | { error: string };

export async function joinQueue(input: {
  slug: string;
  serviceId: string;
  dateStr: string;
  professionalId?: string;
}): Promise<JoinQueueResult> {
  if (!input.professionalId) return { error: 'Escolha um profissional pra entrar na fila.' };
  // Conta é REQUISITO da fila web (identidade real p/ posição, sair e receber o aviso).
  const account = await getCustomerAccount();
  if (!account) return { error: 'Entre na sua conta pra entrar na fila.' };

  const res = await joinWaitlist({
    slug: input.slug,
    serviceId: input.serviceId,
    professionalId: input.professionalId,
    dateStr: input.dateStr,
    name: account.name ?? '',
    phone: account.phone ?? account.pendingPhone ?? undefined,
    account,
    now: new Date(),
  });
  if ('error' in res) return { error: res.error };
  const entry = await prisma.waitlistEntry.findUnique({
    where: { id: res.entryId },
    select: { tenantId: true, professionalId: true, date: true, createdAt: true },
  });
  return { ok: true, position: entry ? await positionOf(entry) : 1 };
}

export async function leaveQueue(input: {
  slug: string;
  serviceId: string;
  dateStr: string;
  professionalId?: string;
}): Promise<{ ok: true } | { error: string }> {
  if (!input.professionalId) return { error: 'Não foi possível sair da fila.' };
  const account = await getCustomerAccount();
  if (!account) return { error: 'Sessão expirada. Entre de novo pra sair da fila.' };
  return leaveWaitlist({
    slug: input.slug,
    professionalId: input.professionalId,
    dateStr: input.dateStr,
    accountId: account.id,
  });
}

// ── Confirmação de vaga (o link do WhatsApp abre /{slug}/fila/{offerId}?e={entryId}) ──
export type QueueSlot = { startsAtIso: string; label: string };

export type QueueOffer =
  // Vaga aberta e válida: todos os horários livres do dia com aquele profissional.
  | {
      state: 'active';
      serviceName: string;
      professionalName: string | null;
      dayLabel: string;
      priceLabel: string | null;
      slots: QueueSlot[];
      /** holdExpiresAt: a tela conta o timer até aqui. */
      expiresAtIso: string;
      /** waitlistWindowMinutes em segundos - rótulo/valor inicial do timer. */
      confirmWindowSeconds: number;
    }
  // A oferta segue ATIVA mas já sem horário livre (todos foram pegos) - o cliente segue na fila.
  | {
      state: 'taken';
      serviceName: string;
      professionalName: string | null;
      dayLabel: string;
      priceLabel: string | null;
      slots: QueueSlot[];
    }
  // Oferta encerrada (FULFILLED/EXHAUSTED) ou timer já vencido / link inválido.
  | { state: 'expired' };

export async function getQueueOffer(
  slug: string,
  offerId: string,
  entryId: string,
): Promise<QueueOffer> {
  void slug;
  const view = await getWaitlistOfferView(offerId, entryId, new Date());
  if (!view || view.expired) return { state: 'expired' };
  const base = {
    serviceName: view.serviceName,
    professionalName: view.professionalName,
    dayLabel: view.dayLabel,
    priceLabel: view.priceLabel,
    slots: view.slots,
  };
  // Ativa mas sem horário livre = todos foram pegos enquanto a oferta rolava.
  if (view.slots.length === 0) return { state: 'taken', ...base };
  return {
    state: 'active',
    ...base,
    expiresAtIso: view.holdExpiresAtIso,
    confirmWindowSeconds: view.confirmWindowSeconds,
  };
}

export type ConfirmQueueSlotResult =
  | { ok: true }
  // Alguém pegou este horário primeiro - volta pra escolher outro. `slots` = os que sobraram.
  | { state: 'taken'; slots?: QueueSlot[] }
  // A oferta/timer expirou entre carregar e confirmar - o cliente segue na fila.
  | { state: 'expired' }
  | { error: string };

export async function confirmQueueSlot(
  slug: string,
  offerId: string,
  entryId: string,
  startsAtIso: string,
): Promise<ConfirmQueueSlotResult> {
  void slug;
  const startsAt = new Date(startsAtIso);
  if (Number.isNaN(startsAt.getTime())) return { error: 'Horário inválido' };

  const res = await confirmWaitlistSlot({ offerId, entryId, startsAt, now: new Date() });
  if ('ok' in res) return { ok: true };

  // Corrida ("alguém foi mais rápido") ou oferta expirada: re-lê o estado autoritativo.
  if (res.taken) {
    const view = await getWaitlistOfferView(offerId, entryId, new Date());
    if (!view || view.expired) return { state: 'expired' };
    return { state: 'taken', slots: view.slots };
  }
  return { error: res.error };
}
