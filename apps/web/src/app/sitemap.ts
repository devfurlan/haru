import type { MetadataRoute } from 'next';

// O robots.ts anuncia /sitemap.xml; este arquivo é quem responde (sem ele, Googlebot
// leva 404 na URL que o próprio robots aponta). Mesma origem do robots pros dois baterem.
//
// Só as rotas ESTÁTICAS de marketing. Fora de propósito:
// - páginas de tenant ([slug]): quem divulga é o dono, não são nossa superfície de SEO;
// - /blog: hoje é só "Em breve", não vale indexar placeholder (entra quando tiver post).
// Rota de marketing nova = uma linha aqui. Todas já estão em RESERVED_SLUGS (@haru/shared),
// então não colidem com [slug].
const PATHS = [
  '',
  '/funcionalidades',
  '/precos',
  '/barbearia',
  '/podologia',
  '/termos',
  '/privacidade',
  '/cookies',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.demandae.com';
  return PATHS.map((path) => ({ url: `${appUrl}${path}` }));
}
