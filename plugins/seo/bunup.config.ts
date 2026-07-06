import { defineConfig, type DefineConfigItem } from 'bunup'

export default defineConfig({
  entry: [
    'src/exports/*'
  ],
  format: ['esm'],
  clean: true,
  dts: { inferTypes: true },
  // Force production JSX runtime. Without explicit `development: false` bunup
  // emits `jsxDEV` calls from `react/jsx-dev-runtime` — those don't exist in
  // production Next.js runtime, so the prerender crashes with
  // "jsxDEV is not a function".
  jsx: {
    runtime: 'automatic',
    importSource: 'react',
    development: false
  },
  external: [
    /node:/,
    /@payloadcms/,
    /^next/,
    /^@vercel\//,
    /^react$/,
    /^react\//,
    /^react-dom/,
    /^payload$/,
    /^payload\//,
  ],
}) as DefineConfigItem