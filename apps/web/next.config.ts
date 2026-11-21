import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Internal packages ship TypeScript source.
  transpilePackages: ['@recycleiq/engine', '@recycleiq/db', '@recycleiq/tokens'],
  serverExternalPackages: ['pg'],
  async headers() {
    return [
      {
        // The public API is called by the mobile app (and Expo web during development).
        source: '/api/v1/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, X-Device-Id' },
        ],
      },
    ];
  },
};

export default nextConfig;
