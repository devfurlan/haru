import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@haru/ui', '@haru/database'],
};

export default nextConfig;
