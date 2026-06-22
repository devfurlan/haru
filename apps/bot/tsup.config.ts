import { defineConfig } from 'tsup';

export default defineConfig({
  // `@haru/payments` aponta pra TS cru (`main: ./src/index.ts`) e o tsup, por
  // padrão, externaliza toda dependency. Externalizado, o pacote é carregado em
  // runtime pelo Node - que NÃO resolve seus imports relativos sem extensão
  // (`./factory`, `./crypto`, `./types`) e mata o processo no boot
  // (ERR_MODULE_NOT_FOUND). Bundlar o pacote aqui resolve esses imports em build
  // e elimina o carregamento de `.ts` cru em produção.
  //
  // `@haru/database` continua external de propósito: precisa do Prisma Client
  // gerado + driver adapter em node_modules no runtime (e payments só importa
  // `type` dele, então nada dele entra no bundle).
  noExternal: ['@haru/payments'],
});
