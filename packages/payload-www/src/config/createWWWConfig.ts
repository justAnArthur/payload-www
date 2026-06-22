import type { AdminComponent, Block, CollectionConfig, Config, GlobalConfig, Plugin } from 'payload'

import { createPagesCollection } from '../data/collections/Pages/index'
import { createPostsCollection } from '../data/collections/Posts/index'
import { createStaticPagesCollection } from '../data/collections/StaticPages/index'
import { createHeaderGlobal } from '../data/collections/globals/Header/config'
import { createFooterGlobal } from '../data/collections/globals/Footer/config'
import { createPreviewHandler } from '../render/preview/createPreviewHandler'
import { createSitemapFile } from '../render/sitemap/createSitemapFile'
import type { PageRouting } from '../render/pages/createCollectionPageExports'

// Render path + slug + sitemap-tag constants. Lives in
// `config/constants.ts` so any module can import it without pulling
// in the full `createWWWConfig` builder. Re-exported here for the
// `/with-www-config` subpath.
import {
  PAGES_RENDER_PATH,
  POSTS_RENDER_PATH,
  HEADER_RENDER_PATH,
  FOOTER_RENDER_PATH,
  PAGES_SLUG,
  STATIC_PAGES_SLUG,
  PAGES_SITEMAP_TAG,
  LIVE_PREVIEW_LISTENER_PATH
} from './constants'
import openAIResolver from "@justanarthur/payload-plugin-translator/resolvers/openAI"

export {
  PAGES_RENDER_PATH,
  POSTS_RENDER_PATH,
  HEADER_RENDER_PATH,
  FOOTER_RENDER_PATH,
  PAGES_SLUG,
  STATIC_PAGES_SLUG,
  PAGES_SITEMAP_TAG,
  LIVE_PREVIEW_LISTENER_PATH
}

export type WWWConfigOptions = {
  /**
   * Locales the host uses. First entry is the default locale
   * (used for translation source-of-truth and the home-page path).
   * The list drives hreflang alternates, sitemap, and the per-locale
   * revalidation tag suffix.
   */
  locales: string[]
  /**
   * The host's next-intl routing config (the value returned from
   * `defineRouting({...})`). When passed, `locales`, `defaultLocale`,
   * and `localePrefix` are read from this object instead of the
   * legacy `locales: string[]` field. `localePrefix` is normalized
   * to the simple string form internally — next-intl's verbose
   * `{ mode, prefixes? }` shape is accepted and reduced to `mode`.
   */
  routing?: PageRouting
  /**
   * Blocks the Pages collection accepts.
   */
  blocks: Block[]
  /**
   * Collection slugs the Header / Footer nav `link` fields can
   * reference. Defaults to `['pages']` (the lib's Pages collection).
   * Pass a different list when your host has additional linkable
   * collections.
   */
  linkRelationTo?: string[]
  /**
   * Register the lib's Posts collection. Default: `true`. The
   * translator plugin's default `collections` list is
   * `['pages', 'posts']`; pass `false` here to opt out and either
   * define your own posts-like collection or drop the translator.
   */
  registerPosts?: boolean
  /**
   * Final say on the lib's default plugin list. Receives the
   * `[seoPlugin, imageHashPlugin, translator]` array; return the
   * list to apply. Common uses: drop the translator (no AI
   * translation in this project), add a second `seoPlugin({...})`
   * call for posts, or layer on a `formBuilderPlugin(...)`.
   */
  defaultPlugins?: (defaults: Plugin[]) => Plugin[]
}

export type WWWConfigApi = {
  withWWWConfig: (config: WWWInputConfig) => Promise<Config> | Config
}

export type WWWInputConfig = Omit<Config, 'collections' | 'globals'> & {
  collections:
    | ((args: { defaultCollections: CollectionConfig[] }) => CollectionConfig[])
    | CollectionConfig[]
  globals:
    | ((args: { defaultGlobals: GlobalConfig[] }) => GlobalConfig[])
    | GlobalConfig[]
}

/**
 * Build the lib's data-config API surface, configured for a specific host.
 *
 * Hosts call this once with their `locales` and `blocks`; the returned
 * object is **safe to import from a Node entrypoint** such as
 * `payload.config.ts` — it only contains Payload collection / global
 * factories and the `withWWWConfig` composer.
 *
 * The lib applies three plugins by default: `seoPlugin` (Pages + meta tab),
 * `imageHashPlugin` (Blurhash/Thumbhash on uploads), and `translator`
 * (auto-translation workflow). Use the `defaultPlugins` callback to
 * drop or extend the list.
 *
 * For the App Router rendering side, import from the lib's render
 * subpaths:
 *
 *   import { createCollectionPageExports } from '@justanarthur/payload-www/render-pages'
 *   import { createPreviewHandler, createSitemapFile } from '@justanarthur/payload-www/render-utils'
 */
export function createWWWConfig(options: WWWConfigOptions): WWWConfigApi {
  const { locales, routing, blocks, linkRelationTo, registerPosts = true, defaultPlugins } = options

  // Source of truth for revalidation path building: `routing` wins
  // when both are passed; `locales` alone keeps the legacy shape
  // working (defaults `localePrefix: 'always'`, first entry as
  // `defaultLocale`).
  const defaultLocale = routing?.defaultLocale ?? locales[0] ?? ''
  const localePrefixMode: 'always' | 'as-needed' | 'never' = (() => {
    const raw = routing?.localePrefix
    if (typeof raw === 'string') return raw
    return raw?.mode ?? 'always'
  })()

  if (locales.length === 0) {
    throw new Error('createWWWConfig: `locales` must contain at least one entry.')
  }

  const buildPagesCollection = () =>
    createPagesCollection(blocks, {
      localePrefix: localePrefixMode,
      defaultLocale
    }) as CollectionConfig
  const buildPostsCollection = () =>
    createPostsCollection({
      localePrefix: localePrefixMode,
      defaultLocale
    }) as CollectionConfig
  const buildStaticPagesCollection = () =>
    createStaticPagesCollection(blocks) as CollectionConfig

  const buildHeaderGlobal = () => createHeaderGlobal({ linkRelationTo }) as GlobalConfig

  const buildFooterGlobal = () => createFooterGlobal({ linkRelationTo }) as GlobalConfig

  async function withWWWConfig(config: WWWInputConfig): Promise<Config> {
    // Direct calls to the imported factories keep their imports alive
    // through bunup's dead-code elimination. The `build*` closures
    // above remain exported for host consumers who want to compose
    // by hand.
    const baseDefaults: CollectionConfig[] = [
      buildPagesCollection(),
      buildStaticPagesCollection()
    ]
    if (registerPosts) baseDefaults.push(buildPostsCollection())
    const defaultCollections = baseDefaults
    const collections =
      typeof config.collections === 'function'
        ? config.collections({ defaultCollections })
        : [...defaultCollections, ...(config.collections || [])]

    const defaultGlobals: GlobalConfig[] = [buildHeaderGlobal(), buildFooterGlobal()]
    const globals =
      typeof config.globals === 'function'
        ? config.globals({ defaultGlobals })
        : [...defaultGlobals, ...(config.globals || [])]

    // Register the lib's render components in the admin importMap.
    // Payload's importMap resolves these paths at build time and the
    // host's `[slug]/page.tsx` reads from the same map at runtime.
    // The live-preview listener is also registered here so the lib's
    // page can render it automatically (resolved via the importMap
    // at request time — no static `'use client'` import in the
    // server entry).
    const renderDependencies: Record<string, AdminComponent> = {
      [PAGES_RENDER_PATH]: { path: PAGES_RENDER_PATH, type: 'component' },
      [POSTS_RENDER_PATH]: { path: POSTS_RENDER_PATH, type: 'component' },
      [HEADER_RENDER_PATH]: { path: HEADER_RENDER_PATH, type: 'component' },
      [FOOTER_RENDER_PATH]: { path: FOOTER_RENDER_PATH, type: 'component' },
      [LIVE_PREVIEW_LISTENER_PATH]: {
        path: LIVE_PREVIEW_LISTENER_PATH,
        type: 'component'
      }
    }

    // Lib's default plugin set. Loaded lazily so Node entrypoints
    // (e.g. `payload seed`) don't pull in the admin UI's CSS via
    // the translator plugin's client components. The plugin
    // factories are pure — calling them at config build time is
    // cheap and the resulting `Plugin` arrays work the same.
    const [
      { seoPlugin },
      { imageHashPlugin },
      { translator }
    ] = await Promise.all([
      import('@justanarthur/payload-plugin-seo'),
      import('@justanarthur/payload-imagehash-plugin'),
      import('@justanarthur/payload-plugin-translator')
    ])
    const defaultPluginList: Plugin[] = [
      seoPlugin({
        collections: ['pages', 'posts', 'static-pages'],
        autoGenerate: { mode: 'onCreate', deriveFrom: 'allScalars' }
      }),
      imageHashPlugin({ algorithm: 'lqip-modern' }),
      translator({
        collections: ['pages', 'posts', 'static-pages'],
        globals: ['header', 'footer'],
        resolvers: [
          openAIResolver({
            apiKey: process.env.OPENAI_API_KEY!,
            chunkLength: 31,
            model: 'gpt-5-mini',
          })
        ]
      })
    ]
    const mergedPlugins: Plugin[] = defaultPlugins
      ? defaultPlugins(defaultPluginList)
      : defaultPluginList

    return {
      ...config,
      collections,
      globals,
      plugins: mergedPlugins,
      admin: {
        ...(config.admin ?? {}),
        dependencies: {
          ...renderDependencies,
          ...(config.admin?.dependencies ?? {})
        }
      }
    } as Config
  }

  return { withWWWConfig }
}

// Re-export the raw collection/global factories for hosts that want to
// compose their own config without going through `createWWWConfig`.
// Note: `createCollectionPageExports` is intentionally NOT re-exported
// here — it imports the client-only `LivePreviewListener` component,
// and re-exporting it would mark the lib's `with-www-config` subpath
// as a client boundary (Next.js would refuse to bundle it into a
// server-only Payload config entry). Hosts import
// `createCollectionPageExports` from the dedicated
// `/render-pages` subpath instead.
export { createPagesCollection } from '../data/collections/Pages/index'
export { createPostsCollection } from '../data/collections/Posts/index'
export { createStaticPagesCollection } from '../data/collections/StaticPages/index'
export { createHeaderGlobal } from '../data/collections/globals/Header/config'
export { createFooterGlobal } from '../data/collections/globals/Footer/config'
export { createPreviewHandler, type CreatePreviewHandlerOptions } from '../render/preview/createPreviewHandler'
export { createSitemapFile, type CreateSitemapFileOptions, type SitemapFunction } from '../render/sitemap/createSitemapFile'
