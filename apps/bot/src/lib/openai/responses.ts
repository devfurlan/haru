import OpenAI from 'openai';
import type {
  FunctionTool,
  ResponseInputItem,
} from 'openai/resources/responses/responses';

import { openai } from './client.js';
import { BOT_MODEL } from './prompts/index.js';
import { executeTool, type ToolContext } from './tools.js';

/** Erros de conexão que valem uma nova tentativa (a resposta nem chegou inteira). */
function isRetriableNetworkError(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  return (
    code === 'ERR_STREAM_PREMATURE_CLOSE' ||
    code === 'ECONNRESET' ||
    code === 'ETIMEDOUT' ||
    code === 'EPIPE' ||
    err instanceof OpenAI.APIConnectionError
  );
}

/**
 * Envolve `openai.responses.create` com retry para falhas de rede que escapam
 * do retry interno do SDK (o premature close chega como FetchError cru ao ler
 * o body já com status 200, então o SDK não o retenta sozinho).
 */
async function createResponse(
  params: OpenAI.Responses.ResponseCreateParamsNonStreaming,
): Promise<OpenAI.Responses.Response> {
  const MAX_ATTEMPTS = 3;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await openai.responses.create(params);
    } catch (err) {
      lastErr = err;
      if (attempt === MAX_ATTEMPTS || !isRetriableNetworkError(err)) throw err;
      console.warn(
        `[openai] tentativa ${attempt}/${MAX_ATTEMPTS} falhou (${(err as { code?: string })?.code ?? 'erro'}), retentando...`,
      );
    }
  }
  throw lastErr;
}

export interface AskBotOptions {
  /** System prompt (substitui as `instructions` da Responses API). */
  instructions: string;
  /** Mensagem nova do usuário. */
  userMessage: string;
  /** response.id do turno anterior, para encadear conversa. */
  previousResponseId?: string;
  /** Contexto a ser injetado como fala prévia do assistant. Aplicado uma vez. */
  pendingAssistantNote?: string;
  /** Entrada prefixada no 1º turno (ex: snapshot do tenant). */
  primerContext?: string;
  /** Nota de sistema injetada antes da mensagem do usuário (one-shot). */
  systemNote?: string;
  /** Trechos de RAG, prependados ao `instructions`. */
  knowledgeContext?: string;
  /** Tools (function-calling) disponíveis ao modelo. */
  tools?: FunctionTool[];
  /** Contexto usado pelos handlers das tools. Obrigatório se `tools` definido. */
  toolContext?: ToolContext;
}

/** Consumo de tokens agregado de um turno (todas as chamadas do loop). */
export interface BotUsage {
  /** Total de input (inclui os cacheados). */
  inputTokens: number;
  /** Subconjunto de `inputTokens` servido do cache. */
  cachedInputTokens: number;
  /** Output total (inclui reasoning). */
  outputTokens: number;
  /** Reasoning (subconjunto de `outputTokens`). */
  reasoningTokens: number;
  /** input + output, conforme reportado pela OpenAI. */
  totalTokens: number;
  /** Quantas chamadas à OpenAI compuseram o turno (1 + tool hops). */
  requests: number;
}

export interface BotResponseResult {
  reply: string;
  responseId: string;
  usage: BotUsage;
}

const ZERO_USAGE: BotUsage = {
  inputTokens: 0,
  cachedInputTokens: 0,
  outputTokens: 0,
  reasoningTokens: 0,
  totalTokens: 0,
  requests: 0,
};

/** Soma o `usage` de uma response ao acumulador do turno (mutação in-place). */
function accumulateUsage(acc: BotUsage, response: OpenAI.Responses.Response): void {
  const u = response.usage;
  if (!u) return;
  acc.inputTokens += u.input_tokens ?? 0;
  acc.cachedInputTokens += u.input_tokens_details?.cached_tokens ?? 0;
  acc.outputTokens += u.output_tokens ?? 0;
  acc.reasoningTokens += u.output_tokens_details?.reasoning_tokens ?? 0;
  acc.totalTokens += u.total_tokens ?? 0;
  acc.requests += 1;
}

const FALLBACK_REPLY =
  'Desculpe, estou com instabilidade no momento. Tente novamente em alguns minutos.';

const MAX_TOOL_HOPS = 5;

function buildInput(opts: AskBotOptions): ResponseInputItem[] {
  const items: ResponseInputItem[] = [];

  if (opts.primerContext) {
    items.push({ role: 'user', content: opts.primerContext });
  }

  if (opts.pendingAssistantNote) {
    items.push({ role: 'assistant', content: opts.pendingAssistantNote });
  }

  if (opts.systemNote) {
    items.push({ role: 'user', content: opts.systemNote });
  }

  items.push({ role: 'user', content: opts.userMessage });

  return items;
}

function extractText(response: OpenAI.Responses.Response): string {
  const direct = (response as { output_text?: string }).output_text;
  if (direct && direct.trim()) return direct.trim();

  const parts: string[] = [];
  for (const item of response.output ?? []) {
    if (item.type !== 'message') continue;
    for (const c of item.content ?? []) {
      if (c.type === 'output_text' && c.text) parts.push(c.text);
    }
  }
  return parts.join('\n').trim();
}

function buildInstructions(opts: AskBotOptions): string {
  if (!opts.knowledgeContext) return opts.instructions;
  return (
    `${opts.instructions}\n\n## Base de conhecimento\n${opts.knowledgeContext}\n\n` +
    `Use a base de conhecimento acima como fonte primária para perguntas factuais sobre ` +
    `serviços, preços, horários e políticas do estabelecimento. Se a pergunta não estiver ` +
    `coberta, responda conforme as instruções gerais.`
  );
}

/**
 * Roda os tool calls pendentes na response e devolve os `function_call_output`
 * a serem submetidos no próximo turno. Retorna `null` se não havia tool calls.
 */
async function runToolCalls(
  ctx: ToolContext | undefined,
  response: OpenAI.Responses.Response,
): Promise<ResponseInputItem[] | null> {
  const calls = (response.output ?? []).filter((item) => item.type === 'function_call');
  if (calls.length === 0) return null;

  if (!ctx) {
    // Sem contexto definido pelo caller - responde "tool não suportada" pra
    // não travar o loop com erro do SDK.
    return calls.map((call) =>
      call.type === 'function_call'
        ? {
            type: 'function_call_output' as const,
            call_id: call.call_id,
            output: JSON.stringify({ ok: false, reason: 'tool context não fornecido' }),
          }
        : ({} as ResponseInputItem),
    );
  }

  const outputs: ResponseInputItem[] = [];
  for (const call of calls) {
    if (call.type !== 'function_call') continue;
    let parsedArgs: Record<string, unknown>;
    try {
      parsedArgs = JSON.parse(call.arguments) as Record<string, unknown>;
    } catch {
      outputs.push({
        type: 'function_call_output',
        call_id: call.call_id,
        output: JSON.stringify({ ok: false, reason: 'arguments JSON inválido' }),
      });
      continue;
    }
    try {
      const result = await executeTool(ctx, call.name, parsedArgs);
      outputs.push({
        type: 'function_call_output',
        call_id: call.call_id,
        output: result,
      });
    } catch (err) {
      console.error(`[tool] ${call.name} falhou:`, err);
      outputs.push({
        type: 'function_call_output',
        call_id: call.call_id,
        output: JSON.stringify({ ok: false, reason: 'erro interno ao executar tool' }),
      });
    }
  }
  return outputs;
}

export async function askBot(opts: AskBotOptions): Promise<BotResponseResult> {
  const usage: BotUsage = { ...ZERO_USAGE };
  try {
    let response = await createResponse({
      model: BOT_MODEL,
      instructions: buildInstructions(opts),
      // String vazia (vinda de um fallback anterior) não é um id válido; omitir.
      previous_response_id: opts.previousResponseId || undefined,
      input: buildInput(opts),
      store: true,
      reasoning: { effort: 'low' },
      tools: opts.tools,
    });
    accumulateUsage(usage, response);

    // Loop de tool calls (cada hop = LLM chamou tool, executamos, resubmetemos)
    for (let hop = 0; hop < MAX_TOOL_HOPS; hop++) {
      const outputs = await runToolCalls(opts.toolContext, response);
      if (!outputs) break;
      response = await createResponse({
        model: BOT_MODEL,
        previous_response_id: response.id,
        input: outputs,
        store: true,
        reasoning: { effort: 'low' },
        tools: opts.tools,
      });
      accumulateUsage(usage, response);
    }

    const reply = extractText(response);
    return {
      reply: reply || FALLBACK_REPLY,
      responseId: response.id,
      usage,
    };
  } catch (err) {
    console.error('Erro ao chamar Responses API:', err);
    return {
      reply: FALLBACK_REPLY,
      responseId: opts.previousResponseId ?? '',
      usage,
    };
  }
}
