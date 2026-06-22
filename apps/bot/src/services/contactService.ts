import prisma from '../lib/prisma.js';

export interface SaveCustomerProfileArgs {
  tenantId: string;
  contactId: string;
  name: string;
  /** Vazio ('') quando o cliente não informou. */
  email: string;
  /** 'YYYY-MM-DD' ou vazio ('') quando o cliente não informou. */
  birthDate: string;
}

export type SaveCustomerProfileResult = { ok: true } | { ok: false; reason: string };

// Validação simples de email - só pra barrar lixo óbvio, não RFC completo.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BIRTHDATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Persiste o cadastro básico do cliente (nome obrigatório; email e nascimento
 * opcionais) e marca `profileCompletedAt` - o sinal que destrava o agendamento
 * (ver gate em appointmentService.bookAppointment). O contato é escopado por
 * contactId, que vem do ToolContext confiável do bot.
 */
export async function saveCustomerProfile(
  args: SaveCustomerProfileArgs,
): Promise<SaveCustomerProfileResult> {
  const name = args.name.trim();
  if (!name) {
    return { ok: false, reason: 'nome obrigatório' };
  }

  let email: string | null = null;
  if (args.email.trim()) {
    email = args.email.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      return { ok: false, reason: 'email inválido' };
    }
  }

  let birthDate: Date | null = null;
  if (args.birthDate.trim()) {
    const raw = args.birthDate.trim();
    if (!BIRTHDATE_RE.test(raw)) {
      return { ok: false, reason: 'data de nascimento inválida (use YYYY-MM-DD)' };
    }
    // Meia-noite UTC - a parte de hora é ignorada na exibição (formatada com timeZone UTC).
    const parsed = new Date(`${raw}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime())) {
      return { ok: false, reason: 'data de nascimento inválida' };
    }
    birthDate = parsed;
  }

  await prisma.contact.update({
    where: { id: args.contactId },
    data: { name, email, birthDate, profileCompletedAt: new Date() },
  });

  return { ok: true };
}
