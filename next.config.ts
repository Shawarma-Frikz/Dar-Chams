import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Static export: the demo must run from files with the network disabled
  // (NFR-02, DEC-025), so there is no server at request time.
  output: 'export',
  trailingSlash: true,
  reactStrictMode: true,
  images: { unoptimized: true },
  // The engine ships TypeScript source inside the workspace (DEC-002).
  transpilePackages: ['@dar-chams/engine'],
};

export default nextConfig;
