import { prisma } from '@haru/database';
import { Search } from 'lucide-react';
import Link from 'next/link';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { requireUserAndTenant } from '@/lib/auth';
import { formatPhoneBR, matchesSearch } from '@haru/shared';

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function ClientsPage({ searchParams }: PageProps) {
  const { tenant } = await requireUserAndTenant();
  const { q } = await searchParams;
  const query = q?.trim() ?? '';
  const digits = query.replace(/\D/g, '');

  // ponytail: com termo, carrega os contatos do tenant e filtra em JS - o Postgres aqui não
  // tem unaccent, então "Joao" precisar casar "João" tem que ser fora do banco. Sem termo,
  // mantém o take no banco (carregamento padrão não regride). Migrar pra unaccent(name)/
  // coluna normalizada + índice se um tenant passar de alguns milhares de contatos.
  const clients = query
    ? (
        await prisma.contact.findMany({
          where: { tenantId: tenant.id },
          orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
          include: { _count: { select: { appointments: true } } },
        })
      )
        .filter(
          (c) => matchesSearch(query, c.name) || (digits.length > 0 && c.phone.includes(digits)),
        )
        .slice(0, 200)
    : await prisma.contact.findMany({
        where: { tenantId: tenant.id },
        orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
        take: 200,
        include: { _count: { select: { appointments: true } } },
      });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight">Clientes</h1>
        <p className="text-sm text-muted-foreground">
          Quem já entrou em contato com o estabelecimento pelo WhatsApp.
        </p>
      </div>

      <form method="get" className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          defaultValue={query}
          placeholder="Buscar por nome ou telefone"
          className="pl-9"
        />
      </form>

      {clients.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {query
              ? 'Nenhum cliente encontrado para essa busca.'
              : 'Nenhum cliente cadastrado ainda. Eles aparecem aqui quando agendam pelo WhatsApp.'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {clients.map((client) => (
            <Link
              key={client.id}
              href={`/clients/${client.id}`}
              className="flex items-center justify-between gap-3 rounded-lg border bg-card p-4 shadow-sm transition-colors hover:bg-accent"
            >
              <div className="min-w-0">
                <div className="truncate font-medium">
                  {client.name ?? formatPhoneBR(client.phone)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatPhoneBR(client.phone)}
                  {client.email ? ` · ${client.email}` : ''}
                </div>
              </div>
              <div className="shrink-0 text-sm text-muted-foreground">
                {client._count.appointments}{' '}
                {client._count.appointments === 1 ? 'agendamento' : 'agendamentos'}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
