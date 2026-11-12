import type { NextConfig } from 'next';

const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8080';

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['127.0.0.1'],
  experimental: {
    useTypeScriptCli: false,
    proxyTimeout: 120_000,
  },
  rewrites: async () => [
    {
      source: '/api/:path*',
      destination: `${backendUrl}/api/v1/:path*`,
    },
  ],
};

export default nextConfig;
