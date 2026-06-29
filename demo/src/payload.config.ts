import { sqliteAdapter } from '@payloadcms/db-sqlite'
import sharp from 'sharp'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import { createWWWConfig } from '@justanarthur/payload-www/with-www-config'

import { Media } from './collections/Media'
import { Categories } from './collections/Categories'
import { Users } from './collections/Users'
import { Content } from './blocks/Content/config'
import { plugins } from './plugins'
import { defaultLexical } from '@/fields/defaultLexical'
import { getServerSideURL } from './utilities/getURL'
import { routing } from "@/i18n/routing"

const dirname = path.dirname(fileURLToPath(import.meta.url))

const { withWWWConfig } = createWWWConfig({
  locales: routing.locales as any,
  blocks: [Content],
  // Header / Footer nav `link` fields can target either Pages or
  // Posts. Defaults to `['pages']` if omitted.
  linkRelationTo: ['pages', 'posts']
})

export default buildConfig(
  await withWWWConfig({
    admin: {
      components: {
        beforeLogin: ['@/components/BeforeLogin'],
        beforeDashboard: ['@/components/BeforeDashboard']
      },
      // Register the demo's block components so the importMap.js
      // exposes them under the keys the lib's `RenderBlocks` looks up
      // (the block slug as the key, with `path` pointing at the
      // module + export).
      //
      // Header / Footer visuals are handled via `globals` override
      // below — the lib's `renderGlobalModule` resolves the global's
      // `custom.path` through the importMap, so pointing it at the
      // host's component keys (`@/Header/Component#default`,
      // `@/Footer/Component#default`) makes `createRootLayoutExports`
      // pick up the demo's styling instead of the lib's minimal
      // defaults. Don't re-declare them under the lib's keys here —
      // the importMap generator deduplicates by key and would strip
      // the lib's auto-registered entries.
      dependencies: {
        content: {
          path: '@/blocks/Content/Component#default',
          type: 'component'
        },
        // The host's Header / Footer visuals — registered under
        // their own keys. The `globals` override below points the
        // header / footer globals' `custom.path` at these keys so
        // `renderGlobalModule`'s lookup hits the host components.
        // We can't override under the lib's keys
        // (`@justanarthur/payload-www/render-pages#HeaderPage`)
        // because Payload's importMap generator deduplicates by
        // key and removes the lib's auto-registered entry instead
        // of replacing it — see `globals` below for the workaround.
        '@/Header/Component#default': {
          path: '@/Header/Component#default',
          type: 'component'
        },
        '@/Footer/Component#default': {
          path: '@/Footer/Component#default',
          type: 'component'
        }
      },
      importMap: { baseDir: path.resolve(dirname) },
      user: Users.slug
    },
    editor: defaultLexical,
    localization: { locales: ['en', 'uk'], defaultLocale: 'en' },
    db: sqliteAdapter({ client: { url: process.env.DATABASE_URL || '' } }),
    collections: ({ defaultCollections }) => [...defaultCollections, Media, Categories, Users],
    cors: [getServerSideURL].filter(Boolean),
    globals: ({ defaultGlobals }) =>
      defaultGlobals.map((g) => {
        // Override the lib's default `custom.path` on the Header /
        // Footer globals so `renderGlobalModule` resolves them via
        // the importMap to the host's visuals (registered under
        // `@/Header/Component#default` and `@/Footer/Component#default`
        // by `payload generate:importmap`).
        //
        // Why this and not a `dependencies` override: Payload's
        // importMap generator deduplicates by key — declaring a
        // dependency with the lib's key
        // (`@justanarthur/payload-www/render-pages#HeaderPage`)
        // REMOVES the lib's auto-registered entry instead of
        // replacing it, so the lib's lookup fails. The override
        // approach points `custom.path` at a host-owned key the
        // generator can't touch.
        if (g.slug === 'header') {
          return { ...g, custom: { ...g.custom, path: '@/Header/Component#default' } }
        }
        if (g.slug === 'footer') {
          return { ...g, custom: { ...g.custom, path: '@/Footer/Component#default' } }
        }
        return g
      }),
    plugins,
    secret: process.env.PAYLOAD_SECRET,
    sharp,
    typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') }
  })
)
