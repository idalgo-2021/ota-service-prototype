import type { NextConfig } from 'next';

// У бэкенда нет CORS, поэтому ходим к нему через прокси Next: `/api/*` → `<BACKEND_URL>/api/v1/*`.
const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8080';

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['127.0.0.1'],
  experimental: {
    // The CLI checker loses its captured --showConfig output in this runtime.
    // TypeScript 5 provides the compiler API, so use Next's supported API checker.
    useTypeScriptCli: false,
    // Assistant replies can take longer than Next's 30-second dev proxy default.
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
