import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.demandae.com';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${appUrl}/sitemap.xml`,
    host: appUrl,
  };
}
