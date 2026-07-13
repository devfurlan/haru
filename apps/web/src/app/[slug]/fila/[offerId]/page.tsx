import { notFound } from 'next/navigation';

import { loadPublicTenant } from '../../_tenant';
import { getQueueOffer } from '../../queue-actions';
import { QueueConfirm } from './queue-confirm';

// Alvo do link do WhatsApp/push da fila: demandae.com/{slug}/fila/{offerId}?e={entryId}
// (deep link definido pela engine - ver [[project_waitlist_engine]]). offerId resolve o
// episódio de vaga; entryId identifica a entrada do cliente na fila (pra confirmar).
export default async function QueueConfirmPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; offerId: string }>;
  searchParams: Promise<{ e?: string }>;
}) {
  const { slug, offerId } = await params;
  const { e: entryId = '' } = await searchParams;
  const tenant = await loadPublicTenant(slug);
  if (!tenant) notFound();

  const offer = await getQueueOffer(slug, offerId, entryId);
  return (
    <QueueConfirm
      slug={slug}
      offerId={offerId}
      entryId={entryId}
      tenantName={tenant.name}
      offer={offer}
    />
  );
}
