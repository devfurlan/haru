import { defineConfig } from 'prisma/config';

// DATABASE_URL/DIRECT_URL são injetadas pelos scripts via `dotenv -e ../../.env` (local)
// ou pela plataforma em process.env (Vercel/Railway). Não usamos o helper `env()` do
// prisma/config porque ele resolve a partir do .env do cwd (packages/database) e ignora process.env.

// `url` abaixo é usada SÓ pela CLI (migrate/introspect/studio); o runtime usa o pg adapter.
const migrationUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!migrationUrl) {
  throw new Error(
    'DATABASE_URL (ou DIRECT_URL) é obrigatória. Rode via scripts do package.json (que carregam ../../.env) ou exporte manualmente.',
  );
}

// Migrations não funcionam pelo transaction pooler do Supabase (porta 6543 / pgbouncer):
// elas travam no advisory lock por até 45 min. Falha rápido com instrução clara.
if (/:6543(\b|\/)|pgbouncer=true/i.test(migrationUrl)) {
  throw new Error(
    'A conexão de migration aponta pro transaction pooler (6543/pgbouncer), que trava no advisory lock. ' +
      'Defina DIRECT_URL com o session pooler do Supabase (porta 5432).',
  );
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: migrationUrl,
  },
});
