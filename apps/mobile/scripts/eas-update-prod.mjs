#!/usr/bin/env node
// Publica OTA no channel `production`.
//
// Existe porque `eas update` NÃO lê o `env` do profile do eas.json - só o `eas build`
// lê. O update bundla com o ambiente LOCAL, e o `.env.local` (Supabase de dev, em
// localhost) vence tudo: foi assim que um update apontando pra http://localhost:54361
// foi parar em produção e deslogou o app de todo mundo (05/08/2026).
//
// As envs aqui vêm do MESMO lugar do build (eas.json) pra não haver drift, com o dotenv
// desligado. `--clear-cache` é obrigatório: o Metro guarda os módulos já transformados
// com as envs antigas, então sem limpar o cache o valor errado volta mesmo passando as
// variáveis certas na linha de comando.
//
// Uso: pnpm --filter mobile update:prod "mensagem do update"
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const easJson = JSON.parse(readFileSync(new URL('../eas.json', import.meta.url), 'utf8'));
const env = easJson.build?.production?.env;
if (!env?.EXPO_PUBLIC_SUPABASE_URL) {
  console.error('eas.json: build.production.env sem EXPO_PUBLIC_SUPABASE_URL - abortando');
  process.exit(1);
}

const message = process.argv.slice(2).join(' ') || 'update';
// ponytail: só android; o bundle web quebra o export (SSR do expo-router + Supabase).
const args = [
  'eas',
  'update',
  '--branch',
  'production',
  '--platform',
  'android',
  '--clear-cache',
  '--message',
  message,
];

console.log(`[update:prod] ${env.EXPO_PUBLIC_SUPABASE_URL} · "${message}"`);
const r = spawnSync('npx', args, {
  stdio: 'inherit',
  env: { ...process.env, ...env, EXPO_NO_DOTENV: '1' },
});
process.exit(r.status ?? 1);
