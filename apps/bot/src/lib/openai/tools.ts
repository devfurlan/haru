import type { FunctionTool } from 'openai/resources/responses/responses';

import {
  bookAppointment,
  cancelAppointmentForContact,
  rescheduleAppointmentForContact,
} from '../../services/appointmentService.js';

export interface ToolContext {
  tenantId: string;
  contactId: string;
}

export const TOOLS: FunctionTool[] = [
  {
    type: 'function',
    name: 'book_appointment',
    description:
      'Cria um agendamento confirmado para o cliente. Use APENAS depois de o cliente ter ' +
      'confirmado explicitamente o serviço e o horário.',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        service_id: {
          type: 'string',
          description:
            'ID do serviço (vide o [srv_...] que aparece na lista de serviços do estabelecimento)',
        },
        starts_at: {
          type: 'string',
          description:
            'Data/hora de início no formato ISO 8601 com offset do fuso do estabelecimento, ' +
            'ex: 2026-05-28T14:00:00-03:00',
        },
      },
      required: ['service_id', 'starts_at'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'cancel_appointment',
    description:
      'Cancela um agendamento futuro do PRÓPRIO cliente. Use APENAS depois do cliente ter ' +
      'confirmado o cancelamento. O ID vem da seção "Seus agendamentos" no contexto.',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        appointment_id: {
          type: 'string',
          description: 'ID do agendamento (vide o [apt_...] em "Seus agendamentos")',
        },
      },
      required: ['appointment_id'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'reschedule_appointment',
    description:
      'Move um agendamento futuro do PRÓPRIO cliente para um novo horário. Mantém o mesmo ' +
      'serviço/duração. Use APENAS depois do cliente confirmar o novo horário.',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        appointment_id: {
          type: 'string',
          description: 'ID do agendamento atual (vide o [apt_...] em "Seus agendamentos")',
        },
        new_starts_at: {
          type: 'string',
          description:
            'Nova data/hora de início no formato ISO 8601 com offset do fuso do estabelecimento, ' +
            'ex: 2026-05-28T14:00:00-03:00. Tem que estar dentro dos horários de atendimento ' +
            'e sem conflito com outros agendamentos.',
        },
      },
      required: ['appointment_id', 'new_starts_at'],
      additionalProperties: false,
    },
  },
];

export async function executeTool(
  ctx: ToolContext,
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  if (name === 'book_appointment') {
    const result = await bookAppointment({
      tenantId: ctx.tenantId,
      contactId: ctx.contactId,
      serviceId: String(args.service_id ?? ''),
      startsAtIso: String(args.starts_at ?? ''),
    });
    return JSON.stringify(result);
  }

  if (name === 'cancel_appointment') {
    const result = await cancelAppointmentForContact({
      tenantId: ctx.tenantId,
      contactId: ctx.contactId,
      appointmentId: String(args.appointment_id ?? ''),
    });
    return JSON.stringify(result);
  }

  if (name === 'reschedule_appointment') {
    const result = await rescheduleAppointmentForContact({
      tenantId: ctx.tenantId,
      contactId: ctx.contactId,
      appointmentId: String(args.appointment_id ?? ''),
      newStartsAtIso: String(args.new_starts_at ?? ''),
    });
    return JSON.stringify(result);
  }

  return JSON.stringify({ ok: false, reason: `tool desconhecida: ${name}` });
}
