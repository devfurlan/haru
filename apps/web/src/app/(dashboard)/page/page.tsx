import { requireUserAndTenant } from '@/lib/auth';

// Esqueleto (Fase 1). Conteúdo real na Fase 3 (vitrine: capa, sobre nós, comodidades).
export default async function PublicPagePage() {
  await requireUserAndTenant();
  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-2">
      <h1 className="font-serif text-[28px] tracking-tight text-ink">Página pública</h1>
      <p className="text-sm text-ink-50">
        Sua vitrine na web - o cliente agenda por ela em segundos. Em breve nesta tela.
      </p>
    </div>
  );
}
