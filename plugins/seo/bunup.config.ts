import { defineConfig, type DefineConfigItem } from 'bunup'

export default defineConfig({
  entry: [
    'src/exports/*'
  ],
  format: ['esm'],
  clean: true,
  dts: { inferTypes: true },
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