import OpenAI from 'openai';

import { env } from '../env.js';

/**
 * Client OpenAI compartilhado pelo bot.
 *
 * IMPORTANTE: forçamos o `fetch` nativo do Node (undici). O `openai@4` cai no
 * `node-fetch@2.7.0` bundlado quando nenhum fetch é passado, e essa versão
 * estoura `ERR_STREAM_PREMATURE_CLOSE` ao descomprimir respostas gzip da
 * OpenAI (atrás do Cloudflare) - derrubava TODAS as chamadas (Responses e
 * Whisper) de forma determinística. O undici lida com gzip corretamente.
 *
 * `maxRetries`/`timeout` cobrem instabilidades transitórias que sobrarem.
 */
type OpenAIOptions = NonNullable<ConstructorParameters<typeof OpenAI>[0]>;

export const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  fetch: globalThis.fetch as unknown as OpenAIOptions['fetch'],
  maxRetries: 3,
  timeout: 90_000,
});
