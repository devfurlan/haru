import 'server-only';

import { z } from 'zod';

// Chamada única à OpenAI Responses API com saída estruturada. Via fetch (REST), sem SDK
// nem dependência nova - mesmo padrão do primitivo de e-mail (lib/email.ts).
// Fail-soft: qualquer erro vira uma resposta de fallback (nunca derruba o chat).

export const SUPPORT_MODEL = 'gpt-5-mini';

const feedbackSchema = z.object({
  categoria: z.enum(['DUVIDA', 'CRITICA', 'SUGESTAO']),
  resumo: z.string(),
  sobreEstabelecimentoId: z.string().nullable(),
});
const outputSchema = z.object({
  reply: z.string(),
  feedback: feedbackSchema.nullable(),
});

export type SupportFeedback = z.infer<typeof feedbackSchema>;
export type SupportAIResult = z.infer<typeof outputSchema>;

export type SupportTurn = { role: 'user' | 'assistant'; content: string };

// json_schema estrito: todo campo em `required`, `additionalProperties: false`,
// nuláveis via array de tipos. Espelha `outputSchema`.
const JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['reply', 'feedback'],
  properties: {
    reply: { type: 'string' },
    feedback: {
      type: ['object', 'null'],
      additionalProperties: false,
      required: ['categoria', 'resumo', 'sobreEstabelecimentoId'],
      properties: {
        categoria: { type: 'string', enum: ['DUVIDA', 'CRITICA', 'SUGESTAO'] },
        resumo: { type: 'string' },
        sobreEstabelecimentoId: { type: ['string', 'null'] },
      },
    },
  },
} as const;

const FALLBACK: SupportAIResult = {
  reply: 'Não consegui responder agora. Pode tentar de novo em instantes?',
  feedback: null,
};

export async function runSupportAI(
  instructions: string,
  history: SupportTurn[],
  message: string,
): Promise<SupportAIResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('[support-ai] OPENAI_API_KEY ausente - resposta de fallback');
    return FALLBACK;
  }

  try {
    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: SUPPORT_MODEL,
        instructions,
        input: [...history, { role: 'user', content: message }],
        reasoning: { effort: 'low' },
        text: {
          format: { type: 'json_schema', name: 'support_reply', strict: true, schema: JSON_SCHEMA },
        },
      }),
    });
    if (!res.ok) {
      console.error('[support-ai]', res.status, await res.text().catch(() => ''));
      return FALLBACK;
    }
    const data = (await res.json()) as unknown;
    const text = extractText(data);
    const parsed = outputSchema.safeParse(text ? JSON.parse(text) : null);
    if (!parsed.success) {
      console.error('[support-ai] saída inesperada', parsed.error.message);
      return FALLBACK;
    }
    return parsed.data;
  } catch (err) {
    console.error('[support-ai] falhou', err);
    return FALLBACK;
  }
}

// Responses API: o texto vive em output[].content[] com type 'output_text'. Modelos de
// reasoning colocam itens de reasoning antes da mensagem - por isso procuramos o item.
function extractText(data: unknown): string | null {
  const d = data as {
    output_text?: string;
    output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>;
  };
  if (typeof d.output_text === 'string') return d.output_text;
  for (const item of d.output ?? []) {
    if (item.type === 'message') {
      const chunk = item.content?.find((c) => c.type === 'output_text');
      if (chunk?.text) return chunk.text;
    }
  }
  return null;
}
