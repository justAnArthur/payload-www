import type { AdminComponent, Block, CollectionConfig, Config, Field, GlobalConfig } from 'payload'

import { createFooterGlobal, createHeaderGlobal, createPagesCollection } from '../data/collections'
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
   * SEO fields (from `@justanarthur/payload-plugin-seo/fields` or your
   * own) to render in the SEO tab on the Pages collection.
   */
  seoFields?: Field[]
  /**
   * Field factory for `slugField`. Defaults to a single `slugField`
   * from payload. Hosts with nested URL schemes pass their own.
   */
  slugField?: Field[]
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
  withWWWConfig: (config: WWWInputConfig) => Config
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
 */
export function createWWWConfig(options: WWWConfigOptions): WWWConfigApi {
  const { i18n, blocks, seoFields, slugField, footerBlocks } = options

  const localeBag = { defaultLocale: i18n.defaultLocale, all: i18n.locales }

  const _createPagesCollection = (
    hostBlocks: Block[],
    overrides: Parameters<typeof createPagesCollection>[1] = {}
  ) =>
    createPagesCollection(hostBlocks, {
      ...overrides,
      renderPath: overrides.renderPath ?? options.pagesRenderPath,
      seoFields: overrides.seoFields ?? seoFields,
      slugField: overrides.slugField ?? slugField,
      locales: overrides.locales ?? localeBag
    })

  const _createHeaderGlobal = (overrides: Parameters<typeof createHeaderGlobal>[0] = {}) =>
    createHeaderGlobal({
      ...overrides,
      renderPath: overrides.renderPath ?? options.headerRenderPath,
      locales: overrides.locales ?? localeBag
    })

  const _createFooterGlobal = (overrides: Parameters<typeof createFooterGlobal>[0] = {}) =>
    createFooterGlobal({
      ...overrides,
      renderPath: overrides.renderPath ?? options.footerRenderPath,
      blocks: overrides.blocks ?? footerBlocks,
      locales: overrides.locales ?? localeBag
    })

  function withWWWConfig(config: WWWInputConfig): Config {
    const defaultCollections: CollectionConfig[] = [
      _createPagesCollection(blocks) as CollectionConfig
    ]
    const collections =
      typeof config.collections === 'function'
        ? config.collections({ defaultCollections })
        : [...defaultCollections, ...(config.collections || [])]

    const defaultGlobals: GlobalConfig[] = [
      _createHeaderGlobal() as GlobalConfig,
      _createFooterGlobal() as GlobalConfig
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

    return {
      ...config,
      collections,
      globals,
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
    createPagesCollection: _createPagesCollection,
    createHeaderGlobal: _createHeaderGlobal,
    createFooterGlobal: _createFooterGlobal
  }
}
