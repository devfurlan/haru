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
  let adaptedConnectionString = connectionString;
  try {
    const parsed = new URL(connectionString);
    if (isLocal) {
      parsed.searchParams.delete('sslmode');
    } else {
      parsed.searchParams.set('sslmode', 'no-verify');
    }
    adaptedConnectionString = parsed.toString();
  } catch {
    if (isLocal) {
      adaptedConnectionString = connectionString.replace(/([?&])sslmode=[^&]*&?/i, '$1');
      adaptedConnectionString = adaptedConnectionString.replace(/[?&]$/, '');
    } else if (!/([?&])sslmode=/i.test(connectionString)) {
      adaptedConnectionString = `${connectionString}${connectionString.includes('?') ? '&' : '?'}sslmode=no-verify`;
    }
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
