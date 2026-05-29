'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { formatPhoneBR } from '@/lib/format';
import { formatFullDateTime, formatRelativeShort } from '@/lib/relative-time';

import {
  getConversationList,
  getThread,
  markConversationRead,
  type ConversationListItem,
  type ThreadMessage,
} from './actions';

interface Props {
  initialConversations: ConversationListItem[];
  initialSelectedId: string | null;
  initialMessages: ThreadMessage[];
}

function displayName(conv: ConversationListItem): string {
  return conv.contactName || formatPhoneBR(conv.contactPhone);
}

/// Iniciais pro avatar: nome → 1ª+última letra; sem nome → últimos 2 dígitos
/// do telefone. Mesmo critério do painel do clicare.
function getInitials(conv: ConversationListItem): string {
  const name = conv.contactName?.trim();
  if (name) {
    const parts = name.split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  const digits = conv.contactPhone.replace(/\D/g, '');
  return digits.slice(-2) || '??';
}

function isUnread(conv: ConversationListItem): boolean {
  if (!conv.lastInboundAt) return false;
  return !conv.lastReadAt || conv.lastInboundAt > conv.lastReadAt;
}

export function ConversationInbox({
  initialConversations,
  initialSelectedId,
  initialMessages,
}: Props) {
  const router = useRouter();
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [messages, setMessages] = useState<ThreadMessage[]>(initialMessages);

  const selectedConv = conversations.find((c) => c.id === selectedId) ?? null;

  // Refs pra acessar valores atuais dentro de callbacks do realtime sem
  // recriar a subscription a cada mudança de estado.
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;
  const listDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Última INBOUND já marcada como lida, pra não disparar markRead repetido.
  const lastMarkedInboundRef = useRef<string | null>(null);

  const refetchList = useCallback(() => {
    getConversationList()
      .then(setConversations)
      .catch(() => {});
  }, []);

  const refetchListDebounced = useCallback(() => {
    if (listDebounceRef.current) clearTimeout(listDebounceRef.current);
    listDebounceRef.current = setTimeout(refetchList, 250);
  }, [refetchList]);

  const refetchThread = useCallback((convId: string) => {
    getThread(convId)
      .then((msgs) => {
        // Só aplica se ainda for a conversa aberta (evita corrida ao trocar rápido).
        if (selectedIdRef.current === convId) setMessages(msgs);
      })
      .catch(() => {});
  }, []);

  // Marca a conversa aberta como lida (otimista no estado local + persiste).
  const markReadLocal = useCallback((convId: string) => {
    const nowIso = new Date().toISOString();
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, lastReadAt: nowIso } : c)),
    );
    markConversationRead(convId).catch(() => {});
  }, []);

  // Ao abrir/trocar de conversa: busca a thread e marca como lida.
  const openConversation = useCallback(
    (convId: string) => {
      setSelectedId(convId);
      lastMarkedInboundRef.current = null;
      refetchThread(convId);
      markReadLocal(convId);
      // Mantém a URL sincronizada (?conv=) sem recarregar a página.
      router.replace(`/conversations?conv=${convId}`, { scroll: false });
    },
    [refetchThread, markReadLocal, router],
  );

  // Quando a conversa aberta já está lida e chega nova INBOUND, re-marca pra o
  // badge não piscar. Detecta pela última msg INBOUND presente na thread.
  useEffect(() => {
    if (!selectedId) return;
    let lastInbound: string | null = null;
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].direction === 'INBOUND') {
        lastInbound = messages[i].createdAt;
        break;
      }
    }
    if (!lastInbound) return;
    if (lastMarkedInboundRef.current === lastInbound) return;
    lastMarkedInboundRef.current = lastInbound;
    markReadLocal(selectedId);
  }, [messages, selectedId, markReadLocal]);

  // Scroll pro rodapé sempre que as mensagens mudam (msg mais recente embaixo).
  const endRef = useRef<HTMLDivElement>(null);
  const firstScrollRef = useRef(true);
  useEffect(() => {
    if (messages.length === 0) return;
    endRef.current?.scrollIntoView({
      behavior: firstScrollRef.current ? 'auto' : 'smooth',
    });
    firstScrollRef.current = false;
  }, [messages]);
  // Reseta o "primeiro scroll" ao trocar de conversa (pula direto pro fim).
  useEffect(() => {
    firstScrollRef.current = true;
  }, [selectedId]);

  // Subscription do Supabase Realtime: novas mensagens / conversas chegam aqui.
  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      // Necessário pra o socket carregar o JWT e o RLS escopar por tenant.
      await supabase.realtime.setAuth(session?.access_token ?? null);
      if (cancelled) return;

      channel = supabase
        .channel('conv-inbox')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'Conversation' },
          () => refetchListDebounced(),
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'Message' },
          (payload) => {
            refetchListDebounced();
            const convId = (payload.new as { conversationId?: string }).conversationId;
            if (convId && convId === selectedIdRef.current) refetchThread(convId);
          },
        )
        .subscribe();
    })();

    // Renova o token no socket quando o Supabase refaz a sessão (~1h), senão
    // o realtime perde autorização e os eventos filtrados por RLS param.
    const { data: authSub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED') {
        supabase.realtime.setAuth(session?.access_token ?? null).catch(() => {});
      }
    });

    return () => {
      cancelled = true;
      authSub.subscription.unsubscribe();
      if (channel) supabase.removeChannel(channel);
    };
  }, [refetchListDebounced, refetchThread]);

  return (
    <div className="-m-6 flex h-[calc(100vh-0px)]">
      {/* Lista */}
      <aside
        className={cn(
          'w-full shrink-0 flex-col border-r bg-card md:flex md:w-80',
          selectedConv ? 'hidden md:flex' : 'flex',
        )}
      >
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
                const active = selectedId === conv.id;
                const unread = isUnread(conv);
                return (
                  <li key={conv.id}>
                    <button
                      type="button"
                      onClick={() => openConversation(conv.id)}
                      className={cn(
                        'flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors',
                        active ? 'bg-accent' : 'hover:bg-muted/60',
                      )}
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                        {getInitials(conv)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span
                            className={cn(
                              'truncate text-sm',
                              unread ? 'font-semibold' : 'font-medium',
                            )}
                          >
                            {displayName(conv)}
                          </span>
                          {conv.lastMessageAt && (
                            <span
                              className={cn(
                                'shrink-0 text-xs',
                                unread ? 'font-medium text-primary' : 'text-muted-foreground',
                              )}
                            >
                              {formatRelativeShort(new Date(conv.lastMessageAt))}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              'min-w-0 flex-1 truncate text-xs',
                              unread ? 'text-foreground' : 'text-muted-foreground',
                            )}
                          >
                            {conv.lastMessageBody ? (
                              <>
                                {conv.lastMessageDirection === 'OUTBOUND' && (
                                  <span className="text-foreground/60">você: </span>
                                )}
                                {conv.lastMessageBody}
                              </>
                            ) : (
                              <span className="italic">sem mensagens</span>
                            )}
                          </div>
                          {unread && (
                            <span className="size-2 shrink-0 rounded-full bg-primary" aria-label="não lida" />
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* Thread */}
      <section className={cn('flex-1 flex-col bg-muted/20', selectedConv ? 'flex' : 'hidden md:flex')}>
        {selectedConv ? (
          <>
            <header className="flex items-center gap-3 border-b bg-card px-4 py-3 md:px-6">
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="text-muted-foreground hover:text-foreground md:hidden"
                aria-label="Voltar"
              >
                ←
              </button>
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                {getInitials(selectedConv)}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{displayName(selectedConv)}</div>
                {selectedConv.contactName && (
                  <div className="truncate text-xs text-muted-foreground">
                    {formatPhoneBR(selectedConv.contactPhone)}
                  </div>
                )}
              </div>
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
                    className={cn('flex', msg.direction === 'INBOUND' ? 'justify-start' : 'justify-end')}
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
                        {formatFullDateTime(new Date(msg.createdAt))}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={endRef} />
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
