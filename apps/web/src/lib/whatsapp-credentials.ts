import { Prisma, prisma } from '@haru/database';

export type SaveWhatsappResult = { ok: true } | { ok: false; error: string };

export interface WhatsappCredentials {
  phoneNumberId: string;
  businessAccountId?: string | null;
  displayPhone?: string | null;
  accessToken: string;
}

/**
 * Persiste as credenciais do WhatsApp Cloud API no Tenant. Fonte única de escrita,
 * usada tanto pelo formulário manual (`connectWhatsapp`) quanto pelo Embedded Signup.
 * Mapeia o conflito de `whatsappPhoneNumberId` (unique) para uma mensagem amigável.
 */
export async function saveWhatsappCredentials(
  tenantId: string,
  creds: WhatsappCredentials,
): Promise<SaveWhatsappResult> {
  try {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        whatsappPhoneNumberId: creds.phoneNumberId,
        whatsappBusinessAccountId: creds.businessAccountId ?? null,
        whatsappDisplayPhone: creds.displayPhone ?? null,
        whatsappAccessToken: creds.accessToken,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return { ok: false, error: 'Esse número já está vinculado a outro estabelecimento' };
    }
    throw err;
  }
  return { ok: true };
}
