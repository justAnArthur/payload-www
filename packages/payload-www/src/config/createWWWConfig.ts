import type { AdminComponent, Block, CollectionConfig, Config, Field, GlobalConfig } from 'payload'

import { createPagesCollection, createHeaderGlobal, createFooterGlobal } from '../data/collections'
import { createLayoutExports, createCollectionPageExports, addCollectionsToSitemap } from '../render/pages'
import { RenderBlocks } from '../core/blocks'
import { LivePreviewListener } from '../render/components'
import { getFromImportMap, generateImportName, renderCollectionModule } from '../core/utils'

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
  createLayoutExports: typeof createLayoutExports
  createCollectionPageExports: typeof createCollectionPageExports
  addCollectionsToSitemap: typeof addCollectionsToSitemap
  RenderBlocks: typeof RenderBlocks
  LivePreviewListener: typeof LivePreviewListener
  getFromImportMap: typeof getFromImportMap
  generateImportName: typeof generateImportName
  renderCollectionModule: typeof renderCollectionModule
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
 * Build the lib's full API surface, configured for a specific host.
 *
 * Hosts call this once with their i18n setup, blocks, and SEO
 * fields. The returned object includes:
 *   - `withWWWConfig` — wraps a `Config` and injects Pages + Header +
 *     Footer with the host's blocks/fields
 *   - `createPagesCollection` / `createHeaderGlobal` / `createFooterGlobal`
 *     — for hosts that want to wire the collections into their own
 *     config manually
 *   - `createLayoutExports` / `createCollectionPageExports` /
 *     `addCollectionsToSitemap` — Next.js page factories (the host
 *     supplies the i18n/getURL/generateMeta deps at call time)
 *   - `RenderBlocks` / `LivePreviewListener` — React renderers
 *   - `getFromImportMap` / `generateImportName` / `renderCollectionModule`
 *     — the import-map utilities
 */
export function createWWWConfig(options: WWWConfigOptions): WWWConfigApi {
  const { i18n, blocks, seoFields, slugField, footerBlocks } = options

  const localeBag = { defaultLocale: i18n.defaultLocale, all: i18n.locales }

  const _createPagesCollection = (
    hostBlocks: Block[],
    overrides: Parameters<typeof createPagesCollection>[1] = {},
  ) =>
    createPagesCollection(hostBlocks, {
      ...overrides,
      renderPath: overrides.renderPath ?? options.pagesRenderPath,
      seoFields: overrides.seoFields ?? seoFields,
      slugField: overrides.slugField ?? slugField,
      locales: overrides.locales ?? localeBag,
    })

  const _createHeaderGlobal = (overrides: Parameters<typeof createHeaderGlobal>[0] = {}) =>
    createHeaderGlobal({
      ...overrides,
      renderPath: overrides.renderPath ?? options.headerRenderPath,
      locales: overrides.locales ?? localeBag,
    })

  const _createFooterGlobal = (overrides: Parameters<typeof createFooterGlobal>[0] = {}) =>
    createFooterGlobal({
      ...overrides,
      renderPath: overrides.renderPath ?? options.footerRenderPath,
      blocks: overrides.blocks ?? footerBlocks,
      locales: overrides.locales ?? localeBag,
    })

  function withWWWConfig(config: WWWInputConfig): Config {
    const defaultCollections: CollectionConfig[] = [
      _createPagesCollection(blocks) as CollectionConfig,
    ]
    const collections =
      typeof config.collections === 'function'
        ? config.collections({ defaultCollections })
        : [...defaultCollections, ...(config.collections || [])]

    const defaultGlobals: GlobalConfig[] = [
      _createHeaderGlobal() as GlobalConfig,
      _createFooterGlobal() as GlobalConfig,
    ]
    const globals =
      typeof config.globals === 'function'
        ? config.globals({ defaultGlobals })
        : [...defaultGlobals, ...(config.globals || [])]

    const renderDependencies: Record<string, AdminComponent> = Object.fromEntries(
      [...collections, ...globals, ...blocks]
        .filter((c) => Boolean((c as { slug?: string })?.slug) && Boolean((c as { custom?: { path?: string } }).custom?.path))
        .map((c) => [
          c.slug as string,
          { path: (c as unknown as { custom: { path: string } }).custom.path, type: 'component' as const } as AdminComponent,
        ]),
    )

    return {
      ...config,
      collections,
      globals,
      admin: {
        ...(config.admin ?? {}),
        dependencies: {
          ...renderDependencies,
          ...(config.admin?.dependencies ?? {}),
        },
      },
    } as Config
  }

  return {
    withWWWConfig,
    createPagesCollection: _createPagesCollection,
    createHeaderGlobal: _createHeaderGlobal,
    createFooterGlobal: _createFooterGlobal,
    createLayoutExports,
    createCollectionPageExports,
    addCollectionsToSitemap,
    RenderBlocks,
    LivePreviewListener,
    getFromImportMap,
    generateImportName,
    renderCollectionModule,
  }
}
