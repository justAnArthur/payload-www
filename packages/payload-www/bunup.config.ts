import { defineConfig, type DefineConfigItem } from 'bunup'
import { exports } from 'bunup/plugins'

export default defineConfig({
  entry: ['src/exports/*'],
  format: ['esm'],
  clean: true,
  splitting: false,
  dts: { inferTypes: true },
  external: [
    /node:/,
    /@payloadcms/,
    /@justanarthur\//,
    /next/,
    /^react$/,
    /^react\//,
    /^react-dom/,
    /^payload$/,
    /^payload\//,
    /^sharp/,
    /^@img\//,
    /^file-type/,
    /^formidable/,
    /^busboy/,
    /^(fs|path|os|crypto|child_process|worker_threads|stream|buffer|url|util|zlib|http|https|tls|net|events|string_decoder|process|readline|querystring|assert|constants|domain|dns|punycode|tty|vm)$/
  ],
  noExternal: [],
  define: {
    'process.env.NODE_ENV': '"production"'
  },
  sourceBase: './src/exports',
  plugins: [
    exports()
  ]
}) as DefineConfigItem