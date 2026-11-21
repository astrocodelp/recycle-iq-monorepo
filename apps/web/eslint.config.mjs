import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const config = [
  ...nextVitals,
  ...nextTs,
  // public/app is the citizen app's generated web export (apps/mobile build:web).
  { ignores: ['.next/**', 'next-env.d.ts', 'public/app/**'] },
];

export default config;
