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
