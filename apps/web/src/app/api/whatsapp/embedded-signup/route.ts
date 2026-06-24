import { prisma } from '@haru/database';

import { requireUserAndTenant } from '@/lib/auth';
import { getBaseUrl } from '@/lib/base-url';
import { saveWhatsappCredentials } from '@/lib/whatsapp-credentials';
import {
  exchangeCodeForToken,
  registerPhoneNumber,
  subscribeAppToWaba,
  WhatsappOnboardingError,
} from '@/lib/whatsapp-onboarding';
import { syncWhatsappProfile } from '@/lib/whatsapp-profile';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Payload {
  mode?: 'coex' | 'new';
  code?: string;
  phoneNumberId?: string;
  wabaId?: string;
  displayPhone?: string;
}

/**
 * Finaliza o Embedded Signup: troca o `code` por token, assina os webhooks da WABA
 * do tenant e grava as credenciais. Coexistence (mesmo número do app do dono) e
 * número novo compartilham este endpoint; a diferença é que número novo registra o
 * número na Cloud API (coexistence não, senão quebraria a coexistence).
 */
export async function POST(req: Request) {
  const { tenant } = await requireUserAndTenant();

  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return Response.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const mode = body.mode === 'new' ? 'new' : 'coex';
  const { code, phoneNumberId, wabaId } = body;

  if (!code || !phoneNumberId || !wabaId) {
    return Response.json(
      { error: 'Faltam dados do onboarding (code, phoneNumberId, wabaId)' },
      { status: 400 },
    );
  }

  try {
    const token = await exchangeCodeForToken(code);
    await subscribeAppToWaba(wabaId, token);

    // Número novo precisa ser registrado na Cloud API com uma PIN de two-step.
    // Coexistence NÃO registra: o número segue ativo no WhatsApp Business App.
    if (mode === 'new') {
      const pin = generatePin();
      await registerPhoneNumber(phoneNumberId, token, pin);
    }

    const saved = await saveWhatsappCredentials(tenant.id, {
      phoneNumberId,
      businessAccountId: wabaId,
      displayPhone: body.displayPhone ?? null,
      accessToken: token,
    });
    if (!saved.ok) {
      return Response.json({ error: saved.error }, { status: 409 });
    }
  } catch (err) {
    if (err instanceof WhatsappOnboardingError) {
      console.error('[embedded-signup]', err.message);
      return Response.json({ error: err.message }, { status: 502 });
    }
    throw err;
  }

  // Empurra o perfil comercial (fire-and-forget tolerante a erro), igual ao fluxo manual.
  const fresh = await prisma.tenant.findUnique({ where: { id: tenant.id } });
  if (fresh) {
    await syncWhatsappProfile(fresh, `${await getBaseUrl()}/${fresh.slug}`).catch(() => {});
  }

  return Response.json({ ok: true });
}

/** PIN de two-step de 6 dígitos para registrar número novo na Cloud API. */
function generatePin(): string {
  let pin = '';
  for (let i = 0; i < 6; i++) {
    pin += Math.floor(Math.random() * 10).toString();
  }
  return pin;
}
