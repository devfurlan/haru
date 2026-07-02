import 'server-only';

// Loop de agente sobre a OpenAI Responses API, via fetch (sem SDK). O modelo pode chamar
// tools; a gente executa e resubmete os resultados até ele responder em texto. É o mesmo
// padrão do bot do WhatsApp (apps/bot/src/lib/openai/responses.ts), enxuto pro suporte.
// Fail-soft: qualquer erro vira uma resposta de fallback (nunca derruba o chat).

export const SUPPORT_MODEL = 'gpt-5-mini';
const MAX_TOOL_HOPS = 6;

export type SupportTurn = { role: 'user' | 'assistant'; content: string };

export type SupportTool = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

type ToolExecutor = (name: string, args: Record<string, unknown>) => Promise<string>;

const FALLBACK = 'Não consegui responder agora. Pode tentar de novo em instantes?';

export async function runSupportAgent(opts: {
  instructions: string;
  history: SupportTurn[];
  message: string;
  tools: SupportTool[];
  execute: ToolExecutor;
}): Promise<{ reply: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('[support-ai] OPENAI_API_KEY ausente - resposta de fallback');
    return { reply: 'Suporte indisponível no momento. Tente de novo em instantes.' };
  }

  const toolDefs = opts.tools.map((t) => ({
    type: 'function' as const,
    name: t.name,
    description: t.description,
    parameters: t.parameters,
    strict: false,
  }));

  try {
    let data = await callResponses(apiKey, {
      model: SUPPORT_MODEL,
      instructions: opts.instructions,
      input: [
        ...opts.history.map((t) => ({ role: t.role, content: t.content })),
        { role: 'user', content: opts.message },
      ],
      tools: toolDefs,
      reasoning: { effort: 'low' },
      store: true,
    });

    for (let hop = 0; hop < MAX_TOOL_HOPS; hop++) {
      const calls = extractToolCalls(data);
      if (calls.length === 0) break;
      const outputs = [];
      for (const call of calls) {
        let output: string;
        try {
          const args = call.arguments ? (JSON.parse(call.arguments) as Record<string, unknown>) : {};
          output = await opts.execute(call.name, args);
        } catch (err) {
          console.error('[support-ai] tool', call.name, err);
          output = JSON.stringify({ error: 'falha ao executar a ferramenta' });
        }
        outputs.push({ type: 'function_call_output', call_id: call.call_id, output });
      }
      data = await callResponses(apiKey, {
        model: SUPPORT_MODEL,
        previous_response_id: data.id,
        input: outputs,
        tools: toolDefs,
        reasoning: { effort: 'low' },
        store: true,
      });
    }

    return { reply: extractText(data) || FALLBACK };
  } catch (err) {
    console.error('[support-ai] falhou', err);
    return { reply: FALLBACK };
  }
}

type ResponsesData = {
  id: string;
  output_text?: string;
  output?: Array<{
    type?: string;
    call_id?: string;
    name?: string;
    arguments?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
};

async function callResponses(
  apiKey: string,
  body: Record<string, unknown>,
): Promise<ResponsesData> {
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Responses API ${res.status}: ${await res.text().catch(() => '')}`);
  }
  return (await res.json()) as ResponsesData;
}

function extractToolCalls(data: ResponsesData) {
  return (data.output ?? [])
    .filter((i) => i.type === 'function_call' && i.call_id && i.name)
    .map((i) => ({ call_id: i.call_id as string, name: i.name as string, arguments: i.arguments ?? '{}' }));
}

// Responses API: o texto vive em output[].content[] com type 'output_text'. Modelos de
// reasoning colocam itens de reasoning/function_call antes da mensagem.
function extractText(data: ResponsesData): string {
  if (typeof data.output_text === 'string' && data.output_text.trim()) {
    return data.output_text.trim();
  }
  const parts: string[] = [];
  for (const item of data.output ?? []) {
    if (item.type === 'message') {
      for (const c of item.content ?? []) {
        if (c.type === 'output_text' && c.text) parts.push(c.text);
      }
    }
  }
  return parts.join('\n').trim();
}
