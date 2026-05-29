import { prisma } from '@haru/database';
import { Search } from 'lucide-react';
import Link from 'next/link';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { requireUserAndTenant } from '@/lib/auth';
import { formatPhoneBR } from '@/lib/format';

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function ClientsPage({ searchParams }: PageProps) {
  const { tenant } = await requireUserAndTenant();
  const { q } = await searchParams;
  const query = q?.trim() ?? '';
  const digits = query.replace(/\D/g, '');

  const clients = await prisma.contact.findMany({
    where: {
      tenantId: tenant.id,
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' as const } },
              ...(digits ? [{ phone: { contains: digits } }] : []),
            ],
          }
        : {}),
    },
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
