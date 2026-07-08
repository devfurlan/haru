import { requireUserAndTenant } from '@/lib/auth';

// Esqueleto (Fase 1). Conteúdo real na Fase 7 (cards de profissional + acessos).
export default async function TeamPage() {
  await requireUserAndTenant();
  return (
    <div className="mx-auto flex w-full max-w-[920px] flex-col gap-2">
      <h1 className="font-serif text-[28px] tracking-tight text-ink">Equipe</h1>
      <p className="text-sm text-ink-50">
        Cada profissional com a própria agenda, no app e na página. Em breve nesta tela.
      </p>
    </div>
  );
}
