/**
 * Slugs reservados: nenhum tenant pode ocupar uma URL que já é rota conhecida em apps/web.
 * Rota estática ganha da dinâmica `[slug]` no Next, então um tenant com slug colidente teria
 * a página pública silenciosamente inalcançável.
 *
 * Fonte ÚNICA dos três pontos que mexem com slug: validação no painel do dono
 * (web settings/actions.ts), validação no admin global (admin clientes/[id]/actions.ts) e
 * leitura pública (web app/[slug]/_tenant.ts). Antes eram três listas mantidas à mão "em
 * sincronia" que já tinham divergido entre si - e nenhuma cobria as rotas de marketing.
 *
 * Ao criar uma rota estática nova na raiz (inclusive landing de nicho), acrescente aqui.
 */
const RESERVED_SLUGS = new Set([
  // infra / arquivos
  'api',
  'auth',
  'robots',
  'robots.txt',
  'sitemap',
  'sitemap.xml',
  // autenticação e onboarding
  'login',
  'signup',
  'ativar',
  'criar-conta',
  'esqueci-senha',
  'redefinir-senha',
  'onboarding',
  // painel do dono
  'account',
  'admin',
  'appointments',
  'assinatura',
  'assinaturas-clientes',
  'business',
  'clients',
  'conversations',
  'dashboard',
  'import',
  'loyalty',
  'page',
  'schedule',
  'services',
  'settings',
  'support',
  'team',
  // área do cliente
  'conta',
  // marketing
  'blog',
  'cookies',
  'funcionalidades',
  'precos',
  'privacidade',
  'termos',
  // landings por nicho (components/marketing/nicho/content.tsx)
  'barbearia',
  'podologia',
]);

const FILE_LIKE_SLUG = /\.[a-z0-9]+$/i;

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug) || FILE_LIKE_SLUG.test(slug);
}
