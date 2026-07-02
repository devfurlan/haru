import 'server-only';

import { prisma } from '@haru/database';
import type { CustomerAccount } from '@haru/database';

import { getCustomerAppointments } from '@/lib/customer';
import {
  cancelOwnedAppointment,
  getOwnedAppointment,
  loadRescheduleSlots,
  rescheduleOwnedAppointment,
} from '@/lib/customer-appointments';
import {
  createSinglePublicBooking,
  getPublicSlots,
  getPublicTenantData,
} from '@/lib/public-booking';

import type { SupportTool } from './ai';

// Ferramentas (function-calling) do bot de suporte. WEB só tem registrar_feedback; MOBILE
// ganha o kit de agendamento assistido, todo reusando os serviços de booking do web (os
// MESMOS que as telas do app usam) - cada mutação passa pelo gate de dono por CustomerAccount.

export type SupportCategoryValue = 'DUVIDA' | 'CRITICA' | 'SUGESTAO';

export type CapturedFeedback = {
  categoria: SupportCategoryValue;
  resumo: string;
  aboutTenantId: string | null;
};

export type SupportToolContext = {
  channel: 'WEB' | 'MOBILE';
  /** Conta do cliente (mobile). Booking exige non-null. */
  account: CustomerAccount | null;
  /** Estabelecimentos do cliente (mobile) - valida o alvo do feedback. */
  establishments: { id: string; name: string }[];
  /** Feedback capturado no turno (setado por registrar_feedback). */
  captured: { feedback: CapturedFeedback | null };
};

const MAX_SLOTS = 30;

const FEEDBACK_TOOL: SupportTool = {
  name: 'registrar_feedback',
  description:
    'Registra uma crítica, sugestão, ou dúvida não resolvida do usuário para o time do Demandaê. ' +
    'Chame quando o usuário reclamar, sugerir algo, ou fizer uma pergunta que você não conseguiu responder.',
  parameters: {
    type: 'object',
    properties: {
      categoria: { type: 'string', enum: ['DUVIDA', 'CRITICA', 'SUGESTAO'] },
      resumo: { type: 'string', description: 'Resumo em 1 frase.' },
      sobreEstabelecimentoId: {
        type: ['string', 'null'],
        description: 'No app, id do estabelecimento quando o feedback é sobre ele; senão null.',
      },
    },
    required: ['categoria', 'resumo'],
  },
};

const BOOKING_TOOLS: SupportTool[] = [
  {
    name: 'listar_meus_agendamentos',
    description: 'Lista os agendamentos ativos (futuros) do cliente, com id para remarcar/cancelar.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'buscar_estabelecimentos',
    description: 'Busca estabelecimentos por nome para o cliente agendar do zero.',
    parameters: {
      type: 'object',
      properties: { q: { type: 'string', description: 'Trecho do nome (>= 2 letras).' } },
      required: ['q'],
    },
  },
  {
    name: 'ver_servicos',
    description: 'Serviços, profissionais e dias de expediente de um estabelecimento (pelo slug).',
    parameters: {
      type: 'object',
      properties: { slug: { type: 'string' } },
      required: ['slug'],
    },
  },
  {
    name: 'horarios_livres',
    description: 'Horários livres de um serviço num dia (YYYY-MM-DD) para agendar do zero.',
    parameters: {
      type: 'object',
      properties: {
        slug: { type: 'string' },
        serviceId: { type: 'string' },
        dateStr: { type: 'string', description: 'YYYY-MM-DD' },
        professionalId: { type: ['string', 'null'] },
      },
      required: ['slug', 'serviceId', 'dateStr'],
    },
  },
  {
    name: 'agendar',
    description:
      'Cria um agendamento para o cliente. Só chame DEPOIS de confirmar serviço, dia e horário com ele.',
    parameters: {
      type: 'object',
      properties: {
        slug: { type: 'string' },
        serviceId: { type: 'string' },
        slotIso: { type: 'string', description: 'Início do slot em ISO 8601 (veio de horarios_livres).' },
        professionalId: { type: ['string', 'null'] },
      },
      required: ['slug', 'serviceId', 'slotIso'],
    },
  },
  {
    name: 'horarios_remarcar',
    description: 'Horários livres para remarcar um agendamento existente num dia (YYYY-MM-DD).',
    parameters: {
      type: 'object',
      properties: {
        appointmentId: { type: 'string' },
        dateStr: { type: 'string', description: 'YYYY-MM-DD' },
      },
      required: ['appointmentId', 'dateStr'],
    },
  },
  {
    name: 'remarcar',
    description: 'Remarca um agendamento do cliente. Confirme o novo horário antes de chamar.',
    parameters: {
      type: 'object',
      properties: {
        appointmentId: { type: 'string' },
        newStartsAtIso: { type: 'string', description: 'Novo início em ISO 8601 (veio de horarios_remarcar).' },
      },
      required: ['appointmentId', 'newStartsAtIso'],
    },
  },
  {
    name: 'cancelar',
    description: 'Cancela um agendamento do cliente. Confirme com ele antes de chamar.',
    parameters: {
      type: 'object',
      properties: { appointmentId: { type: 'string' } },
      required: ['appointmentId'],
    },
  },
];

export function buildSupportTools(channel: 'WEB' | 'MOBILE'): SupportTool[] {
  return channel === 'MOBILE' ? [FEEDBACK_TOOL, ...BOOKING_TOOLS] : [FEEDBACK_TOOL];
}

export async function executeSupportTool(
  ctx: SupportToolContext,
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const account = ctx.account;

  switch (name) {
    case 'registrar_feedback': {
      const categoria = str(args.categoria) as SupportCategoryValue;
      if (!['DUVIDA', 'CRITICA', 'SUGESTAO'].includes(categoria)) {
        return json({ error: 'categoria inválida' });
      }
      const wanted = str(args.sobreEstabelecimentoId);
      const aboutTenantId = wanted
        ? (ctx.establishments.find((e) => e.id === wanted)?.id ?? null)
        : null;
      ctx.captured.feedback = { categoria, resumo: str(args.resumo), aboutTenantId };
      return json({ ok: true });
    }

    // --- Daqui pra baixo: só mobile (exige conta) -------------------------------
    case 'listar_meus_agendamentos': {
      if (!account) return json({ error: 'indisponível' });
      const { upcoming } = await getCustomerAppointments(account);
      return json({
        agendamentos: upcoming.map((a) => ({
          appointmentId: a.id,
          estabelecimento: a.tenant.name,
          servico: a.serviceName,
          profissional: a.professionalName,
          quando: a.whenLabel,
          iso: a.startsAt.toISOString(),
          status: a.status,
        })),
      });
    }

    case 'buscar_estabelecimentos': {
      if (!account) return json({ error: 'indisponível' });
      const q = str(args.q).trim();
      if (q.length < 2) return json({ resultados: [] });
      const rows = await prisma.tenant.findMany({
        where: { publicBookingEnabled: true, name: { contains: q, mode: 'insensitive' } },
        select: { name: true, slug: true },
        orderBy: { name: 'asc' },
        take: 10,
      });
      return json({ resultados: rows.map((r) => ({ nome: r.name, slug: r.slug })) });
    }

    case 'ver_servicos': {
      const data = await getPublicTenantData(str(args.slug));
      if (!data) return json({ error: 'estabelecimento não encontrado' });
      return json({
        nome: data.name,
        horizonDays: data.horizonDays,
        openWeekdays: data.openWeekdays,
        servicos: data.services.map((s) => ({
          serviceId: s.id,
          nome: s.name,
          duracaoMin: s.durationMinutes,
          precoCents: s.priceCents,
          profissionalIds: s.professionalIds,
        })),
        profissionais: data.professionals.map((p) => ({ id: p.id, nome: p.name })),
      });
    }

    case 'horarios_livres': {
      const slots = await getPublicSlots(
        str(args.slug),
        str(args.serviceId),
        str(args.dateStr),
        str(args.professionalId) || undefined,
      );
      return json({ slots: freeSlots(slots) });
    }

    case 'agendar': {
      if (!account) return json({ error: 'indisponível' });
      if (!account.phone) {
        return json({
          error: 'O cliente precisa verificar o telefone no app (aba conta) antes de agendar por aqui.',
        });
      }
      if (!account.name) {
        return json({ error: 'O cliente precisa ter nome no cadastro para agendar.' });
      }
      const result = await createSinglePublicBooking({
        slug: str(args.slug),
        serviceId: str(args.serviceId),
        professionalId: str(args.professionalId) || undefined,
        startsAt: new Date(str(args.slotIso)),
        name: account.name,
        phone: account.phone,
        account,
      });
      return json(result);
    }

    case 'horarios_remarcar': {
      if (!account) return json({ error: 'indisponível' });
      const appt = await getOwnedAppointment(account.id, str(args.appointmentId));
      if (!appt) return json({ error: 'Agendamento não encontrado' });
      const slots = await loadRescheduleSlots(
        account,
        appt.id,
        appt.serviceId,
        str(args.dateStr),
      );
      return json({ slots: freeSlots(slots) });
    }

    case 'remarcar': {
      if (!account) return json({ error: 'indisponível' });
      const iso = str(args.newStartsAtIso);
      const when = new Date(iso);
      if (Number.isNaN(when.getTime())) return json({ error: 'horário inválido' });
      return json(await rescheduleOwnedAppointment(account, str(args.appointmentId), when));
    }

    case 'cancelar': {
      if (!account) return json({ error: 'indisponível' });
      return json(await cancelOwnedAppointment(account, str(args.appointmentId)));
    }

    default:
      return json({ error: `ferramenta desconhecida: ${name}` });
  }
}

function freeSlots(slots: { startsAtIso: string; label: string; available?: boolean }[]) {
  return slots
    .filter((s) => s.available !== false)
    .slice(0, MAX_SLOTS)
    .map((s) => ({ iso: s.startsAtIso, hora: s.label }));
}

function json(v: unknown): string {
  return JSON.stringify(v);
}
