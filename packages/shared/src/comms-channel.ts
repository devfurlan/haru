// Seletor de canal "own-channels-first" - PARTE PURA, compartilhada entre web (Next) e bot
// (Fastify). Cada app tem seus próprios senders (WhatsApp/e-mail/push diferentes), mas a
// DECISÃO de quais canais usar mora aqui, num único lugar, pra não divergir. Zero IO.
//
// Motivação de produto: reduzir dependência da Meta/WhatsApp. Push e e-mail são canais
// próprios (sem custo de template, sem risco de plataforma). O WhatsApp vira o último recurso.

export type CommsPrimary = 'PUSH' | 'EMAIL' | 'WHATSAPP' | 'NONE';

/** Canais que serão de fato tentados + o canal PRIMÁRIO pela hierarquia (pro log de métrica). */
export type ChannelPlan = {
  push: boolean;
  email: boolean;
  whatsapp: boolean;
  primary: CommsPrimary;
};

/**
 * Decide os canais a partir da ELEGIBILIDADE já resolvida de cada um (o destinatário tem o
 * canal E existe copy pra ele E não optou por sair). Decisão por elegibilidade, NÃO por
 * sucesso de envio: push (Expo) e e-mail (Resend) são fire-and-forget/podem ter falha
 * transitória - esperar falhar pra cair no WhatsApp mandaria WhatsApp em toda instabilidade.
 *
 * - Padrão (fallback own-first): WhatsApp só quando NÃO há push NEM e-mail. Minimiza WhatsApp.
 * - whatsappAlways=true: WhatsApp sai JUNTO com os canais próprios. Use só onde o WhatsApp
 *   ganha o custo: comms crítico de dinheiro (garantia de chegar) ou sensível a tempo real
 *   (janela curta + alta abertura imediata). Ex.: falha de pagamento da assinatura, "vaga abriu".
 *
 * `primary` reflete a hierarquia PUSH > EMAIL > WHATSAPP > NONE - o canal PRÓPRIO principal que
 * carregou o comms. É o que vai pra métrica "% saiu por push/email vs WhatsApp". O WhatsApp de
 * REFORÇO (whatsappAlways com push/email presentes) não muda o primary de propósito: ele mede
 * se o canal próprio cobriu, não é um segundo envio a contabilizar.
 */
export function pickChannels(
  eligible: { push: boolean; email: boolean; whatsapp: boolean },
  opts: { whatsappAlways?: boolean } = {},
): ChannelPlan {
  const push = eligible.push;
  const email = eligible.email;
  const whatsapp = eligible.whatsapp && (opts.whatsappAlways === true || (!push && !email));
  return {
    push,
    email,
    whatsapp,
    primary: push ? 'PUSH' : email ? 'EMAIL' : whatsapp ? 'WHATSAPP' : 'NONE',
  };
}
