import { defineConfig } from 'tsup';

export default defineConfig({
  // `@haru/payments` e `@haru/billing` apontam pra TS cru (`main: ./src/index.ts`)
  // e o tsup, por padrão, externaliza toda dependency. Externalizado, o pacote é
  // carregado em runtime pelo Node - que NÃO resolve seus imports relativos sem
  // extensão (`./factory`, `./crypto`, `./types`, `./gating`, `./snapshot`) e mata
  // o processo no boot (ERR_MODULE_NOT_FOUND). Bundlar os pacotes aqui resolve
  // esses imports em build e elimina o carregamento de `.ts` cru em produção.
  //
  // `@haru/database` continua external de propósito: precisa do Prisma Client
  // gerado + driver adapter em node_modules no runtime (e payments/billing só
  // importam dele o que resolve via node_modules, então nada cru entra no bundle).
  noExternal: ['@haru/payments', '@haru/billing'],
});
