/**
 * @justanarthur/payload-www — shared Payload CMS website template.
 *
 * Public API surface (no default exports; everything is named):
 *
 *   createWWWConfig({ fields, blocks, components, hooks, i18n, seo, ... })
 *     → returns a configured object with:
 *         withWWWConfig, createPagesCollection, createHeaderGlobal,
 *         createFooterGlobal, createLayoutExports, createCollectionPageExports,
 *         RenderBlocks, LivePreviewListener, getFromImportMap,
 *         generateImportName, renderCollectionModule,
 *         buildArticleLd, buildBreadcrumbsLd, buildOrganizationLd,
 *         buildHreflangAlternates, queryDocBySlug, queryAllDocs, queryAllLocaleSlugs,
 *         segmentsToStoredSlug, segmentsToUrlPath, storedSlugToSegments, getUrlPath, buildCanonicalUrl,
 *         addCollectionsToSitemap
 *
 * Hosts call `createWWWConfig` once with their fields/blocks/i18n/SEO
 * configuration and use the returned API. This keeps the lib stateless
 * and lets the demo (and the camasys `www` site) inject host-specific
 * dependencies without forking the lib.
 */
export { createWWWConfig, type WWWConfigOptions, type WWWConfigApi } from './createWWWConfig'
export { anyone, authenticated, authenticatedOrPublished } from './access'
export { createRevalidatePageHooks, type RevalidatePageOptions } from './hooks/revalidatePage'
export { createRevalidateGlobalHook, type RevalidateGlobalOptions } from './hooks/revalidateGlobal'
export { createTranslateToOtherLocalesHook, type TranslateToOtherLocalesOptions } from './hooks/translateToOtherLocales'
export { populatePublishedAt } from './hooks/populatePublishedAt'
export { link, linkGroup, appearanceOptions, type LinkAppearances } from './fields'
export { getFromImportMap, generateImportName, renderCollectionModule } from './utils'
export { buildArticleLd, buildBreadcrumbsLd, buildOrganizationLd, buildHreflangAlternates, queryDocBySlug, queryAllDocs, queryAllLocaleSlugs, getUrlPath, segmentsToStoredSlug, segmentsToUrlPath, storedSlugToSegments, buildCanonicalUrl, type BreadcrumbItem } from './metadata'
export { LivePreviewListener, type LivePreviewListenerProps } from './components'
export { RenderBlocks, type RenderBlocksProps } from './blocks'
export { createBaseSeed, type CreateBaseSeedOptions, type CreateBaseSeedResult, type SeedPageInput, type SeedPostInput, type SeedUserInput, type SeedCategoryInput } from './seed'
export { createTestPayload, type CreateTestPayloadOptions, type CreateTestPayloadResult } from './test'
