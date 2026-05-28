import prisma from '../lib/prisma.js';

/**
 * Resolve qual Tenant atende um determinado `phone_number_id` da Meta.
 *
 * Cada Tenant onboardado via Embedded Signup tem seu próprio phone_number_id —
 * essa função é o roteador principal do bot multi-tenant.
 */
export async function findTenantByPhoneNumberId(phoneNumberId: string) {
  return prisma.tenant.findUnique({
    where: { whatsappPhoneNumberId: phoneNumberId },
  });
}
