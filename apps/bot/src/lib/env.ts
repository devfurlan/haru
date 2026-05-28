function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

export const env = {
  get WHATSAPP_VERIFY_TOKEN() {
    return required('WHATSAPP_VERIFY_TOKEN');
  },
  get WHATSAPP_APP_SECRET() {
    return required('WHATSAPP_APP_SECRET');
  },
  get OPENAI_API_KEY() {
    return required('OPENAI_API_KEY');
  },
  get UPSTASH_REDIS_REST_URL() {
    return required('UPSTASH_REDIS_REST_URL');
  },
  get UPSTASH_REDIS_REST_TOKEN() {
    return required('UPSTASH_REDIS_REST_TOKEN');
  },
  get SUPABASE_URL() {
    return required('SUPABASE_URL');
  },
  get SUPABASE_SERVICE_ROLE_KEY() {
    return required('SUPABASE_SERVICE_ROLE_KEY');
  },
  get BOT_INTERNAL_TOKEN() {
    return required('BOT_INTERNAL_TOKEN');
  },
  get HEALTHCHECKS_URL() {
    return process.env.HEALTHCHECKS_URL ?? '';
  },
  /**
   * Fallback de access_token usado em dev quando o Tenant ainda não cadastrou o
   * seu token via `/settings`. Em produção cada Tenant tem o seu (resolvido no
   * `lib/whatsapp/client.ts` por phone_number_id).
   */
  get WHATSAPP_PLATFORM_ACCESS_TOKEN(): string | undefined {
    return process.env.WHATSAPP_PLATFORM_ACCESS_TOKEN ?? undefined;
  },
};
