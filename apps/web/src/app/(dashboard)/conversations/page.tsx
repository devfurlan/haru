import { requireUserAndTenant } from '@/lib/auth';

import { ConversationInbox } from './conversation-inbox';
import { getConversationList, getThread } from './actions';

interface PageProps {
  searchParams: Promise<{ conv?: string }>;
}

// O realtime depende de dados frescos do DB a cada visita; sem cache estático.
export const dynamic = 'force-dynamic';

export default async function ConversationsPage({ searchParams }: PageProps) {
  await requireUserAndTenant();
  const { conv: selectedConvId } = await searchParams;

  const conversations = await getConversationList();
  const selectedId = selectedConvId
    ? (conversations.find((c) => c.id === selectedConvId)?.id ?? null)
    : (conversations[0]?.id ?? null);

  const messages = selectedId ? await getThread(selectedId) : [];

  return (
    <ConversationInbox
      initialConversations={conversations}
      initialSelectedId={selectedId}
      initialMessages={messages}
    />
  );
}
