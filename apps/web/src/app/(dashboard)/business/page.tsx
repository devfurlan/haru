import { redirect } from 'next/navigation';

// O editor do estabelecimento foi absorvido pela Página pública (/page) no redesign.
// Mantido como redirect para não quebrar links/bookmarks antigos de /business.
export default function BusinessPage() {
  redirect('/page');
}
