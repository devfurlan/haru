import { requireCustomerAccount } from '@/lib/customer-auth';
import { getFavorites } from '@/app/(customer)/actions';

import { BuscarClient } from './buscar-client';

export const dynamic = 'force-dynamic';

// Aba "Buscar" (diretório de estabelecimentos + favoritos). A busca e a geolocalização
// rodam no client; aqui só garantimos a sessão e semeamos os favoritos iniciais.
export default async function BuscarPage() {
  await requireCustomerAccount();
  const favorites = await getFavorites();
  return <BuscarClient initialFavorites={favorites} />;
}
