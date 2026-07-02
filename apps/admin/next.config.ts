import type { NextConfig } from 'next';

// Painel admin nunca é embutido em iframe → frame DENY (anti-clickjacking, mais forte que o
// SAMEORIGIN do web). Demais headers idem web. Sem CSP (exigiria teste dedicado).
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@haru/ui', '@haru/database'],
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
