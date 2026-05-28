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

  // Em runtimes serverless, confiar em `sslmode=no-verify` na URL é mais previsível
  // do que depender de flags `ssl` no adapter.
  const isLocal = /@(localhost|127\.0\.0\.1)/.test(connectionString);
  const queryIndex = connectionString.indexOf('?');
  let adaptedConnectionString = connectionString;
  if (queryIndex !== -1) {
    const params = new URLSearchParams(connectionString.slice(queryIndex + 1));
    if (isLocal) {
      params.delete('sslmode');
    } else {
      params.set('sslmode', 'no-verify');
    }
    const query = params.toString();
    adaptedConnectionString = connectionString.slice(0, queryIndex) + (query ? `?${query}` : '');
  } else if (!isLocal) {
    adaptedConnectionString = `${connectionString}?sslmode=no-verify`;
  }

  const adapter = new PrismaPg({ connectionString: adaptedConnectionString });
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
