import type { NextConfig } from 'next';

// Headers de segurança em todas as respostas. Conservador de propósito (sem CSP, que exigiria
// testar a app + SDKs de terceiros): só o que é seguro por padrão. frame SAMEORIGIN, nosniff,
// referrer restrito e HSTS (Vercel serve HTTPS).
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@haru/ui', '@haru/database', '@haru/shared'],
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
