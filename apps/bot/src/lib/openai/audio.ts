import OpenAI from 'openai';
import { toFile } from 'openai/uploads';

import { env } from '../env.js';

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

const MIME_TO_EXT: Record<string, string> = {
  'audio/ogg': 'ogg',
  'audio/opus': 'ogg',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/mp4': 'm4a',
  'audio/aac': 'aac',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/webm': 'webm',
};

function extFromMime(mime: string): string {
  const base = mime.split(';')[0].trim().toLowerCase();
  return MIME_TO_EXT[base] ?? 'bin';
}

/**
 * Transcreve áudio recebido via WhatsApp usando whisper-1. Idioma fixado em
 * pt — produto brasileiro. Se um dia atendermos outras línguas, expor parâmetro.
 */
export async function transcribeAudio(buffer: Buffer, mimeType: string): Promise<string> {
  const cleanMime = mimeType.split(';')[0].trim();
  const file = await toFile(buffer, `audio.${extFromMime(mimeType)}`, { type: cleanMime });
  const result = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    language: 'pt',
  });
  return result.text.trim();
}
