import type { NextConfig } from 'next';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// One .env at the repo root serves the web app and the db scripts. Next only reads apps/web/.env*,
// so load the root files too. Variables already set (Vercel, shell) are never overridden.
for (const file of ['.env.local', '.env']) {
  const path = resolve(process.cwd(), '../..', file);
  if (existsSync(path)) process.loadEnvFile(path);
}

const nextConfig: NextConfig = {
  // Internal packages ship TypeScript source.
  transpilePackages: ['@recycleiq/engine', '@recycleiq/db', '@recycleiq/tokens'],
  serverExternalPackages: ['pg'],
  // The citizen app's web build lives in public/app (exported from apps/mobile with baseUrl /app).
  // Its routes are client-side, so every /app path that is not a file serves the app shell.
  async rewrites() {
    return { beforeFiles: [], afterFiles: [], fallback: [{ source: '/app/:path*', destination: '/app/index.html' }] };
  },
  // The landing page lives at / and the municipal dashboard at /city. Old dashboard links with a range
  // (/?range=30) keep working; /about was the landing page's first address.
  async redirects() {
    return [
      { source: '/', has: [{ type: 'query', key: 'range' }], destination: '/city', permanent: false },
      { source: '/about', destination: '/', permanent: false },
      { source: '/dashboard', destination: '/city', permanent: false },
      // One address per domain: www goes to the bare name (add both www names to the Vercel project).
      { source: '/:path*', has: [{ type: 'host', value: 'www.recycleiq.eu' }], destination: 'https://recycleiq.eu/:path*', permanent: true },
      { source: '/:path*', has: [{ type: 'host', value: 'www.recycleiq.gr' }], destination: 'https://recycleiq.gr/:path*', permanent: true },
    ];
  },
  async headers() {
    return [
      {
        // The public API is called by the mobile app (and Expo web during development).
        source: '/api/v1/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, X-Device-Id' },
          { key: 'Access-Control-Expose-Headers', value: 'X-Assistant-Remaining, X-Assistant-Limit, Retry-After' },
        ],
      },
    ];
  },
};

export default nextConfig;
