import { defineConfig } from 'prisma/config';

// DATABASE_URL é injetada pelos scripts em package.json via `dotenv -e ../../.env`.
// Não usamos o helper `env()` do prisma/config porque ele tenta resolver a partir
// do .env do cwd (packages/database) e ignora process.env.
if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is required. Run via package.json scripts (which load ../../.env) or export it manually.',
  );
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Runtime (app via pg adapter) usa DATABASE_URL = transaction pooler (6543, ?pgbouncer=true).
    url: process.env.DATABASE_URL,
    // `prisma migrate`/`db push` usam directUrl = session pooler (5432), que suporta
    // advisory lock e DDL (o transaction pooler não). Em dev local, aponta pro mesmo Postgres.
    directUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});
