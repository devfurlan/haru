import { prisma } from '@haru/database';
import Link from 'next/link';

import { requireUserAndTenant } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { formatFullDateTime, formatRelativeShort } from '@/lib/relative-time';

interface PageProps {
  searchParams: Promise<{ conv?: string }>;
}

export default async function ConversationsPage({ searchParams }: PageProps) {
  const { tenant } = await requireUserAndTenant();
  const { conv: selectedConvId } = await searchParams;

  const conversations = await prisma.conversation.findMany({
    where: { tenantId: tenant.id },
    include: {
      contact: true,
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  });

  const selectedConv = selectedConvId
    ? conversations.find((c) => c.id === selectedConvId) ?? null
    : conversations[0] ?? null;

  const messages = selectedConv
    ? await prisma.message.findMany({
        where: { conversationId: selectedConv.id },
        orderBy: { createdAt: 'asc' },
        take: 500,
      })
    : [];

  return (
    <div className="-m-6 flex h-[calc(100vh-0px)]">
      {/* Lista */}
      <aside className="hidden w-80 shrink-0 flex-col border-r bg-card md:flex">
        <div className="border-b px-4 py-3">
          <h1 className="text-base font-semibold">Conversas</h1>
          <p className="text-xs text-muted-foreground">
            {conversations.length === 0 ? 'Nenhuma ainda' : `${conversations.length} contato(s)`}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              Quando o bot receber mensagens, os contatos aparecem aqui.
            </div>
          ) : (
            <ul>
              {conversations.map((conv) => {
                const lastMsg = conv.messages[0];
                const active = selectedConv?.id === conv.id;
                return (
                  <li key={conv.id}>
                    <Link
                      href={`/conversations?conv=${conv.id}`}
                      className={cn(
                        'flex items-start gap-3 border-b px-4 py-3 transition-colors',
                        active ? 'bg-accent' : 'hover:bg-muted/60',
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-sm font-medium">
                            {conv.contact.name || conv.contact.phone}
                          </span>
                          {lastMsg && (
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {formatRelativeShort(lastMsg.createdAt)}
                            </span>
                          )}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {lastMsg ? (
                            <>
                              {lastMsg.direction === 'OUTBOUND' && (
                                <span className="text-foreground/60">você: </span>
                              )}
                              {lastMsg.body}
                            </>
                          ) : (
                            <span className="italic">sem mensagens</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* Thread */}
      <section className="flex flex-1 flex-col bg-muted/20">
        {selectedConv ? (
          <>
            <header className="border-b bg-card px-6 py-3">
              <div className="text-sm font-semibold">
                {selectedConv.contact.name || selectedConv.contact.phone}
              </div>
              {selectedConv.contact.name && (
                <div className="text-xs text-muted-foreground">{selectedConv.contact.phone}</div>
              )}
            </header>
            <div className="flex-1 space-y-2 overflow-y-auto p-6">
              {messages.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  Sem mensagens nesta conversa.
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex',
                      msg.direction === 'INBOUND' ? 'justify-start' : 'justify-end',
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm',
                        msg.direction === 'INBOUND'
                          ? 'rounded-bl-md bg-card'
                          : 'rounded-br-md bg-primary text-primary-foreground',
                      )}
                    >
                      <div className="whitespace-pre-wrap break-words">{msg.body}</div>
                      <div
                        className={cn(
                          'mt-1 text-[10px]',
                          msg.direction === 'INBOUND'
                            ? 'text-muted-foreground'
                            : 'text-primary-foreground/70',
                        )}
                      >
                        {formatFullDateTime(msg.createdAt)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Selecione uma conversa à esquerda.
          </div>
        )}
      </section>
    </div>
  );
}
