/**
 * Tabela de preços da OpenAI (USD por 1M de tokens) e cálculo de custo.
 *
 * ATENÇÃO: estes valores são copiados da tabela pública da OpenAI e usados para
 * ESTIMAR o custo gravado em `AiUsageLog`. Se a OpenAI mudar o preço, atualize
 * aqui - os registros antigos preservam o preço da época (custo é congelado na
 * escrita), então editar isto só afeta o consumo futuro.
 */
export interface ModelPricing {
  /** USD por 1M de tokens de input não-cacheados. */
  input: number;
  /** USD por 1M de tokens de input servidos do cache (desconto). */
  cachedInput: number;
  /** USD por 1M de tokens de output (inclui reasoning). */
  output: number;
}

const PRICING: Record<string, ModelPricing> = {
  // gpt-5-mini: input $0.25/M, cached input $0.025/M (90% off), output $2.00/M.
  'gpt-5-mini': { input: 0.25, cachedInput: 0.025, output: 2.0 },
  // gpt-5: input $1.25/M, cached input $0.125/M, output $10.00/M.
  'gpt-5': { input: 1.25, cachedInput: 0.125, output: 10.0 },
};

export interface UsageTokens {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
}

/**
 * Calcula o custo estimado (USD) de um turno. Os tokens cacheados são um
 * SUBCONJUNTO de `inputTokens`, então o input não-cacheado é a diferença.
 * Retorna 0 (e avisa) para modelos sem preço cadastrado.
 */
export function estimateCostUsd(model: string, usage: UsageTokens): number {
  const price = PRICING[model];
  if (!price) {
    console.warn(`[pricing] modelo sem preço cadastrado: ${model} - custo gravado como 0`);
    return 0;
  }
  const uncachedInput = Math.max(0, usage.inputTokens - usage.cachedInputTokens);
  const cost =
    (uncachedInput * price.input +
      usage.cachedInputTokens * price.cachedInput +
      usage.outputTokens * price.output) /
    1_000_000;
  return cost;
}
