import { defineConfig, type DefineConfigItem } from 'bunup'
import { exports } from 'bunup/plugins'

export default defineConfig({
  entry: [
    'src/exports/*',
    'src/exports/resolvers/*'
  ],
  format: ['esm'],
  clean: true,
  // Disable code-splitting: with splitting on, bunup produces
  // phantom `export { x }` re-exports without their definitions
  // when shim files re-export from barrel modules (e.g. the
  // `src/exports/*` pattern). With splitting off, every symbol is
  // inlined into its entry file. Slightly larger entry files but
  // no broken exports.
  splitting: false,
  // Infer declaration types with the TypeScript compiler instead of
  // bunup's default isolated-declarations mode, which requires explicit
  // annotations on every export and emits warnings that CI escalates to
  // fatal errors (and otherwise produces degraded .d.ts).
  dts: { inferTypes: true },
  // Flatten `src/exports/<name>.ts` → `dist/<name>.{js,d.ts}` so
  // the exports() plugin can map entries to clean subpath names
  // (`.`, `./jobs`, `./resolvers/google`, etc.) instead of leaking
  // `src/exports/...` into the public exports field.
  sourceBase: './src/exports',
  plugins: [
    // customExports preserves the original `.`, `./client`,
    // `./resolvers/*`, `./types` subpath aliases AND adds the new
    // `./jobs` subpath. Without customExports, the exports() plugin
    // auto-generates only from built dist files and renames `.` to
    // `./index` (etc.), which silently breaks every consumer doing
    // `import { translator } from '@justanarthur/payload-plugin-translator'`.
    exports({
      customExports: () => ({
        '.': {
          import: {
            types: './dist/index.d.ts',
            default: './dist/index.js'
          }
        },
        './jobs': {
          import: {
            types: './dist/jobs.d.ts',
            default: './dist/jobs.js'
          }
        },
        './client': {
          import: {
            types: './dist/client.d.ts',
            default: './dist/client.js'
          }
        },
        './types': {
          import: {
            types: './dist/types.d.ts',
            default: './dist/types.js'
          }
        },
        './resolvers/types': {
          import: {
            types: './dist/resolvers/types.d.ts',
            default: './dist/resolvers/types.js'
          }
        },
        './resolvers/google': {
          import: {
            types: './dist/resolvers/google.d.ts',
            default: './dist/resolvers/google.js'
          }
        },
        './resolvers/copy': {
          import: {
            types: './dist/resolvers/copy.d.ts',
            default: './dist/resolvers/copy.js'
          }
        },
        './resolvers/openAI': {
          import: {
            types: './dist/resolvers/openAI.d.ts',
            default: './dist/resolvers/openAI.js'
          }
        },
        './resolvers/libreTranslate': {
          import: {
            types: './dist/resolvers/libreTranslate.d.ts',
            default: './dist/resolvers/libreTranslate.js'
          }
        }
      })
    })
  ]
}) as DefineConfigItem
