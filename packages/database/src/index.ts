import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function makeClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }
  // Pooler do Supabase usa TLS com cert que não valida na cadeia padrão do Node. O `pg`
  // verifica por padrão, e o `sslmode` da URL sobrescreve o `ssl` da config — então
  // removemos o `sslmode` e desligamos a verificação aqui. Postgres local não usa TLS.
  const isLocal = /@(localhost|127\.0\.0\.1)/.test(connectionString);
  const queryIndex = connectionString.indexOf('?');
  let cleanedConnectionString = connectionString;
  if (queryIndex !== -1) {
    const params = new URLSearchParams(connectionString.slice(queryIndex + 1));
    params.delete('sslmode');
    const query = params.toString();
    cleanedConnectionString = connectionString.slice(0, queryIndex) + (query ? `?${query}` : '');
  }
  const adapter = new PrismaPg({
    connectionString: cleanedConnectionString,
    ...(isLocal ? {} : { ssl: { rejectUnauthorized: false } }),
  });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? makeClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export * from '@prisma/client';
