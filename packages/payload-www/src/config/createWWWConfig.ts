import type { AdminComponent, Block, CollectionConfig, Config, Field, GlobalConfig, Plugin } from 'payload'

import { seoPlugin } from '@justanarthur/payload-plugin-seo'
import { imageHashPlugin } from '@justanarthur/payload-imagehash-plugin'
import { translator } from '@justanarthur/payload-plugin-translator'

import { createPagesCollection } from '../data/collections/Pages/index'
import { createHeaderGlobal } from '../data/collections/globals/Header/config'
import { createFooterGlobal } from '../data/collections/globals/Footer/config'
// NOTE: render fns (createLayoutExports, createCollectionPageExports,
// RenderBlocks, LivePreviewListener, renderCollectionModule, ...) are
// App-Router-only. They are intentionally NOT re-exported from
// `createWWWConfig` and must be imported from the `render/*` subpath
// (`@justanarthur/payload-www/render-pages`, `render-components`,
// `render-blocks`, `render-utils`) in App Router contexts only.
// Importing them at the top level here would chain `next/headers`,
// `next/cache`, `next/navigation` and React into the root barrel and
// break builds that import `createWWWConfig` from a Node entrypoint
// such as `payload.config.ts`.

// `seoPlugin`, `imageHashPlugin`, and `translator` are NOT statically
// imported here. All three plugin dists chain into
// `@payloadcms/ui/EditUpload`, which inlines a `.css` import for
// `react-image-crop`. Bundlers (next/webpack) handle that at build
// time, but plain Node ESM rejects unknown extensions (vitest, the
// lib's own test suite, raw `node -e ...` smoke tests). We resolve
// them lazily inside `withWWWConfig` via dynamic import — that's
// what makes `withWWWConfig` async. Hosts must `await` it from
// `payload.config.ts`.

export type WWWConfigOptions = {
  /**
   * Locales the host uses. `defaultLocale` is the source for translation
   * jobs; `locales` is the full list (used for hreflang alternates,
   * sitemap, and i18n routing).
   */
  i18n: { defaultLocale: string; locales: readonly string[] }
  /**
   * Blocks the Pages collection accepts.
   */
  blocks: Block[]
  /**
   * SEO configuration applied as a default `seoPlugin` from
   * `@justanarthur/payload-plugin-seo` to the Pages collection.
   *
   * Pass `false` to opt out and manage SEO yourself. Pass an object
   * to customise the default plugin (e.g. `uploadsCollection`).
   */
  seo?:
    | false
    | {
        uploadsCollection?: string
        openaiApiKey?: string
        interfaceName?: string
      }
  /**
   * Custom SEO fields (override the default plugin's meta field). Use
   * this only if you have a custom SEO setup and want to bypass the
   * default `seoPlugin`. The lib drops the legacy `seoFields` option
   * — use `seo` instead.
   */
  seoFields?: Field[]
  /**
   * Slug field(s) for the Pages collection. Accepts a flat array of
   * fields, or a factory returning one. The factory form is the
   * pattern the demo uses: pass `() => [slugField()]` so the host can
   * chain options on the field at call time. The lib calls the
   * factory once at build time and spreads the result.
   */
  slugField?: Field[] | (() => Field[])
  /**
   * URL composer for page revalidation. Receives the page slug (or
   * `undefined` for the home page) and the current locale, returns
   * the public URL path to revalidate. Overrides the lib's default
   * `/${locale}/${slug}` builder. Pass this when your site doesn't
   * put the locale in the path (e.g. `slug === 'home' ? '/' : `/${slug}``).
   */
  pagePathBuilder?: (slug: string | undefined) => string
  /**
   * Override for the link field used by `navItem` blocks in the
   * Header global. Defaults to the lib's `link` with
   * `disableLabel: true`. The host that needs different options
   * (custom relationTo, overrides, ...) passes their own factory.
   */
  linkField?: (options?: { appearances?: false | 'default'[] }) => any
  /**
   * Override for the link group field used by `navColumn` blocks in
   * the Header global and inside the Footer's `nav` array. Defaults
   * to the lib's own `linkGroup` factory.
   */
  linkGroupField?: (options?: any) => any
  /**
   * `imageHashPlugin` from `@justanarthur/payload-imagehash-plugin`,
   * applied as a default. Pass `false` to opt out, or an object to
   * override the algorithm / blurhash visibility.
   */
  imageHash?: false | { algorithm?: string; showBlurhashField?: boolean }
  /**
   * `translator` from `@justanarthur/payload-plugin-translator`,
   * applied as a default to the listed collections and globals. Pass
   * `false` to opt out. The default is `['pages', 'posts']` for
   * collections and `['header', 'footer']` for globals. Hosts that
   * need resolvers should pass `translator: false` here and add
   * their own `translator({ ..., resolvers: [...] })` plugin via
   * `config.plugins` (or extend the option in a future task).
   */
  translator?: false | { collections?: string[]; globals?: string[] }
  /**
   * Blocks the Footer global's `blocks` field accepts. Defaults to
   * an empty list.
   */
  footerBlocks?: Block[]
  /**
   * Render-path overrides. Wired into `custom.path` so the lib can
   * register them in the importMap. Default: the lib's internal
   * render modules for Pages/Header/Footer.
   */
  pagesRenderPath?: string
  headerRenderPath?: string
  footerRenderPath?: string
}

export type WWWConfigApi = {
  withWWWConfig: (config: WWWInputConfig) => Promise<Config>
  createPagesCollection: typeof createPagesCollection
  createHeaderGlobal: typeof createHeaderGlobal
  createFooterGlobal: typeof createFooterGlobal
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
 * Build the lib's data-config API surface, configured for a specific
 * host.
 *
 * Hosts call this once with their i18n setup, blocks, and SEO
 * fields. The returned object is **safe to import from a Node entrypoint**
 * such as `payload.config.ts` — it only contains Payload collection /
 * global factories and the `withWWWConfig` composer.
 *
 * For the App Router rendering side (page factories, Live Preview
 * listener, block renderer, import-map utilities, ...), import
 * directly from the `render/*` subpaths:
 *
 *   import { createCollectionPageExports } from '@justanarthur/payload-www/render-pages'
 *   import { LivePreviewListener } from '@justanarthur/payload-www/render-components'
 *   import { RenderBlocks } from '@justanarthur/payload-www/render-blocks'
 *
 * Those modules pull in `next/headers`, `next/cache`, `next/navigation`
 * and React, so they MUST stay out of the root barrel and out of
 * `payload.config.ts`.
 *
 * `withWWWConfig` is async because the default `imageHash` and
 * `translator` plugins are dynamically imported to keep this module's
 * static import graph free of CSS-chain React UI deps. The demo's
 * `payload.config.ts` must `await` the result.
 */
export function createWWWConfig(options: WWWConfigOptions): WWWConfigApi {
  const {
    i18n,
    blocks,
    seo,
    slugField,
    pagePathBuilder,
    linkField,
    linkGroupField,
    imageHash = { algorithm: 'lqip-modern' },
    translator: translatorOpt = { collections: ['pages', 'posts'], globals: ['header', 'footer'] },
    footerBlocks
  } = options

  const localeBag = { defaultLocale: i18n.defaultLocale, all: i18n.locales }

  const buildPagesCollection = (
    hostBlocks: Block[],
    overrides: Parameters<typeof createPagesCollection>[1] = {}
  ) =>
    createPagesCollection(hostBlocks, {
      ...overrides,
      renderPath: overrides.renderPath ?? options.pagesRenderPath,
      // SEO is now applied as a default seoPlugin in withWWWConfig — do not
      // double-inject via seoFields. Hosts that opt out via `seo: false`
      // can still pass their own seoFields through `overrides`.
      seoFields: overrides.seoFields,
      slugField: overrides.slugField ?? slugField,
      locales: overrides.locales ?? localeBag,
      pagePathBuilder: overrides.pagePathBuilder ?? pagePathBuilder
    })

  const buildHeaderGlobal = (overrides: Parameters<typeof createHeaderGlobal>[0] = {}) =>
    createHeaderGlobal({
      ...overrides,
      renderPath: overrides.renderPath ?? options.headerRenderPath,
      locales: overrides.locales ?? localeBag,
      linkField: overrides.linkField ?? linkField,
      linkGroupField: overrides.linkGroupField ?? linkGroupField
    })

  const buildFooterGlobal = (overrides: Parameters<typeof createFooterGlobal>[0] = {}) =>
    createFooterGlobal({
      ...overrides,
      renderPath: overrides.renderPath ?? options.footerRenderPath,
      blocks: overrides.blocks ?? footerBlocks,
      locales: overrides.locales ?? localeBag,
      linkGroupField: overrides.linkGroupField ?? linkGroupField
    })

  async function withWWWConfig(config: WWWInputConfig): Promise<Config> {
    // Direct calls to the imported factories (not via the `build*` closures
    // above). bunup's dead-code elimination can drop an import whose only
    // uses are inside a closure that's only invoked through a returned
    // object — `createPagesCollection(blocks)` here keeps the import alive
    // in the dist. The `build*` wrappers are still exported for host
    // consumers below.
    const defaultCollections: CollectionConfig[] = [
      createPagesCollection(blocks, {
        renderPath: options.pagesRenderPath,
        slugField,
        locales: localeBag,
        pagePathBuilder
      }) as CollectionConfig
    ]
    const collections =
      typeof config.collections === 'function'
        ? config.collections({ defaultCollections })
        : [...defaultCollections, ...(config.collections || [])]

    const defaultGlobals: GlobalConfig[] = [
      createHeaderGlobal({
        renderPath: options.headerRenderPath,
        locales: localeBag,
        linkField,
        linkGroupField
      }) as GlobalConfig,
      createFooterGlobal({
        renderPath: options.footerRenderPath,
        blocks: footerBlocks,
        locales: localeBag,
        linkGroupField
      }) as GlobalConfig
    ]
    const globals =
      typeof config.globals === 'function'
        ? config.globals({ defaultGlobals })
        : [...defaultGlobals, ...(config.globals || [])]

    const renderDependencies: Record<string, AdminComponent> = Object.fromEntries(
      [...collections, ...globals, ...blocks]
        .filter((c) => Boolean((c as { slug?: string })?.slug) && Boolean((c as {
          custom?: { path?: string }
        }).custom?.path))
        .map((c) => [
          c.slug as string,
          {
            path: (c as unknown as { custom: { path: string } }).custom.path,
            type: 'component' as const
          } as AdminComponent
        ])
    )

    // SEO plugin is applied as a default by the lib so hosts don't have to
    // import `seoPlugin` from `@justanarthur/payload-plugin-seo` themselves.
    // Hosts that want their own SEO setup can pass `seo: false` to opt out.
    const seoPluginConfig: Plugin[] =
      seo === false
        ? []
        : [
            seoPlugin({
              collections: ['pages'],
              uploadsCollection: seo?.uploadsCollection,
              ...(seo?.openaiApiKey !== undefined ? { openaiApiKey: seo.openaiApiKey } : {}),
              ...(seo?.interfaceName !== undefined ? { interfaceName: seo.interfaceName } : {})
            })
          ]

    // `imageHashPlugin` and `translator` are also default-applied. The
    // workspace plugins' source is structured so the field factories are
    // server-safe (`'use client'` is confined to the React component
    // files), which means static imports here don't pull the CSS / client
    // chain into the lib's module-init graph.
    const imageHashPlugins: Plugin[] =
      imageHash === false
        ? []
        : [
            imageHashPlugin({
              algorithm: imageHash.algorithm ?? 'lqip-modern',
              ...(imageHash.showBlurhashField !== undefined
                ? { showBlurhashField: imageHash.showBlurhashField }
                : {})
            })
          ]

    const translatorPlugins: Plugin[] =
      translatorOpt === false
        ? []
        : [
            translator({
              collections: translatorOpt.collections ?? ['pages', 'posts'],
              globals: translatorOpt.globals ?? ['header', 'footer'],
              resolvers: []
            })
          ]

    // lib defaults first, host plugins appended last so a host can
    // re-apply any of these (e.g. a second `translator({ ..., resolvers })`
    // call) to layer on configuration. If a host wants to drop a
    // default, they opt out via the corresponding `false` option.
    const existingPlugins = Array.isArray(config.plugins) ? config.plugins : []
    const mergedPlugins: Plugin[] = [
      ...seoPluginConfig,
      ...imageHashPlugins,
      ...translatorPlugins,
      ...existingPlugins
    ]

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

  return {
    withWWWConfig,
    createPagesCollection: buildPagesCollection,
    createHeaderGlobal: buildHeaderGlobal,
    createFooterGlobal: buildFooterGlobal
  }
}

// Re-export the raw collection/global factories as named exports of this
// module. Hosts that want to compose their own config can import them
// directly from `@justanarthur/payload-www/server` without going through
// `createWWWConfig`.
export { createPagesCollection, createHeaderGlobal, createFooterGlobal }
