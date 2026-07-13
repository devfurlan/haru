// GET /api/mobile/v1/waitlist/[offerId]?entry=<entryId> - tela de confirmação da fila:
// TODOS os horários livres do dia com o profissional + contexto. Sem auth (o par
// offerId+entryId é a capacidade); expira sozinho quando o episódio encerra.
import { getWaitlistOfferView } from '@/lib/waitlist';

export async function GET(req: Request, { params }: { params: Promise<{ offerId: string }> }) {
  const { offerId } = await params;
  const entryId = new URL(req.url).searchParams.get('entry') ?? '';
  if (!entryId) return Response.json({ error: 'Inscrição inválida' }, { status: 400 });

  const view = await getWaitlistOfferView(offerId, entryId, new Date());
  if (!view) return Response.json({ error: 'Oferta não encontrada' }, { status: 404 });
  return Response.json(view);
}
