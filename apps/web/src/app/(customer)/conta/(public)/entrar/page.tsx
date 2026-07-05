import { redirect } from 'next/navigation';

// Login unificado em /login (dono e cliente na mesma tela). Mantemos esta rota
// como redirect porque o /auth/callback e links antigos ainda apontam pra cá.
export default async function CustomerLoginRedirect({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  redirect(error ? `/login?error=${encodeURIComponent(error)}` : '/login');
}
