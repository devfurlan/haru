// Verificação de posse do telefone por OTP via SMS (Twilio Verify). É o que torna
// seguro o claim por telefone na área do cliente: sem provar que controla o número,
// ninguém reivindica os agendamentos (nome/CPF/histórico) de terceiros.
//
// Usa o Twilio Verify (a Twilio gera/expira/limita o código - não guardamos nada).
// Chamadas via fetch + Basic Auth, sem SDK (mesmo estilo do resto do projeto).
//
// Envs (apps/web/.env): TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID.

const VERIFY_BASE = 'https://verify.twilio.com/v2/Services';

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  serviceSid: string;
}

function getConfig(): TwilioConfig | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!accountSid || !authToken || !serviceSid) return null;
  return { accountSid, authToken, serviceSid };
}

function authHeader(c: TwilioConfig): string {
  return `Basic ${Buffer.from(`${c.accountSid}:${c.authToken}`).toString('base64')}`;
}

export type OtpResult = { ok: true } | { ok: false; error: string };

/**
 * Envia um código de verificação por SMS para o número (E.164 sem '+', ex.:
 * "5511912345678"). Fail-soft: se as envs não estiverem configuradas, retorna erro
 * claro em vez de quebrar.
 */
export async function sendPhoneOtp(phoneE164: string): Promise<OtpResult> {
  const c = getConfig();
  if (!c) {
    console.error('[twilio] TWILIO_* ausente - verificação por SMS indisponível');
    return { ok: false, error: 'Verificação por SMS indisponível no momento.' };
  }
  try {
    const res = await fetch(`${VERIFY_BASE}/${c.serviceSid}/Verifications`, {
      method: 'POST',
      headers: {
        Authorization: authHeader(c),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: `+${phoneE164}`, Channel: 'sms' }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      console.error(`[twilio] send OTP ${res.status}: ${txt}`);
      if (res.status === 429) {
        return { ok: false, error: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.' };
      }
      return { ok: false, error: 'Não foi possível enviar o código. Confira o número.' };
    }
    return { ok: true };
  } catch (err) {
    console.error('[twilio] send OTP falhou', err);
    return { ok: false, error: 'Não foi possível enviar o código. Tente novamente.' };
  }
}

/**
 * Confere o código digitado contra o número. `ok: true` só quando a Twilio aprova
 * (status approved + valid). Código errado/expirado retorna erro amigável.
 */
export async function checkPhoneOtp(phoneE164: string, code: string): Promise<OtpResult> {
  const c = getConfig();
  if (!c) {
    console.error('[twilio] TWILIO_* ausente - verificação por SMS indisponível');
    return { ok: false, error: 'Verificação por SMS indisponível no momento.' };
  }
  try {
    const res = await fetch(`${VERIFY_BASE}/${c.serviceSid}/VerificationCheck`, {
      method: 'POST',
      headers: {
        Authorization: authHeader(c),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: `+${phoneE164}`, Code: code }),
    });
    if (!res.ok) {
      // 404 = a verificação expirou ou nunca existiu (Twilio apaga após aprovar/expirar).
      const txt = await res.text().catch(() => '');
      console.error(`[twilio] check OTP ${res.status}: ${txt}`);
      return { ok: false, error: 'Código inválido ou expirado. Peça um novo.' };
    }
    const data = (await res.json().catch(() => null)) as {
      status?: string;
      valid?: boolean;
    } | null;
    if (data?.status === 'approved' && data?.valid) {
      return { ok: true };
    }
    return { ok: false, error: 'Código inválido ou expirado. Peça um novo.' };
  } catch (err) {
    console.error('[twilio] check OTP falhou', err);
    return { ok: false, error: 'Não foi possível validar o código. Tente novamente.' };
  }
}
