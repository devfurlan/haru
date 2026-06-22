import prisma from '../lib/prisma.js';
import { estimateCostUsd } from '../lib/openai/pricing.js';
import type { BotUsage } from '../lib/openai/responses.js';

interface RecordAiUsageParams {
  tenantId: string;
  conversationId?: string;
  model: string;
  usage: BotUsage;
}

/**
 * Grava o consumo de tokens de um turno do bot em `AiUsageLog`, com o custo
 * estimado pelo preço vigente do modelo. Idempotência não é necessária: cada
 * turno gera no máximo uma chamada.
 *
 * Chamar como fire-and-forget (`.catch`) - não deve atrasar a resposta ao
 * cliente nem derrubar o fluxo se a escrita falhar.
 */
export async function recordAiUsage(params: RecordAiUsageParams): Promise<void> {
  const { tenantId, conversationId, model, usage } = params;

  // Nada foi consumido (ex: primeira chamada falhou antes de qualquer response).
  if (usage.requests === 0) return;

  const costUsd = estimateCostUsd(model, usage);

  await prisma.aiUsageLog.create({
    data: {
      tenantId,
      conversationId: conversationId ?? null,
      model,
      inputTokens: usage.inputTokens,
      cachedInputTokens: usage.cachedInputTokens,
      outputTokens: usage.outputTokens,
      reasoningTokens: usage.reasoningTokens,
      totalTokens: usage.totalTokens,
      requests: usage.requests,
      costUsd,
    },
  });

  const cacheHit =
    usage.inputTokens > 0 ? Math.round((usage.cachedInputTokens / usage.inputTokens) * 100) : 0;
  console.log(
    `[ai-usage] tenant=${tenantId} model=${model} in=${usage.inputTokens} ` +
      `(cache ${cacheHit}%) out=${usage.outputTokens} reqs=${usage.requests} ` +
      `custo=$${costUsd.toFixed(6)}`,
  );
}
