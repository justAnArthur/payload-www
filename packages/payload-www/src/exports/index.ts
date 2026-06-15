import { createWWWConfig } from '../createWWWConfig'

export { createWWWConfig, type WWWConfigOptions, type WWWConfigApi, type WWWInputConfig } from '../createWWWConfig'

export { anyone, authenticated, authenticatedOrPublished } from '../access/index'
export {
  createRevalidatePageHooks,
  type RevalidatePageOptions,
} from '../hooks/revalidatePage'
export { createRevalidateGlobalHook, type RevalidateGlobalOptions } from '../hooks/revalidateGlobal'
export {
  createTranslateToOtherLocalesHook,
  type TranslateToOtherLocalesOptions,
} from '../hooks/translateToOtherLocales'
export { populatePublishedAt } from '../hooks/populatePublishedAt'

export { link, appearanceOptions, type LinkAppearances, type LinkOptions } from '../fields/link'
export { linkGroup } from '../fields/linkGroup'

export { getFromImportMap } from '../utils/getFromImportMap'
export { generateImportName } from '../utils/generateImportName'
export { renderCollectionModule } from '../utils/renderCollectionModule'

export {
  buildArticleLd,
  buildBreadcrumbsLd,
  buildOrganizationLd,
  type ArticleLdOptions,
  type BreadcrumbItem,
} from '../metadata/jsonld'
export { buildHreflangAlternates } from '../metadata/hreflang'
export {
  getUrlPath,
  segmentsToStoredSlug,
  segmentsToUrlPath,
  storedSlugToSegments,
  buildCanonicalUrl,
} from '../metadata/slug'
export {
  queryDocBySlug,
  queryAllDocs,
  queryAllLocaleSlugs,
  getRenderModuleExports,
} from '../metadata/query'

export { LivePreviewListener, type LivePreviewListenerProps } from '../components/(payload)/LivePreviewListener'
export { RenderBlocks, type RenderBlocksProps } from '../blocks/renderBlocks'

export {
  createBaseSeed,
  type CreateBaseSeedOptions,
  type CreateBaseSeedResult,
  type SeedPageInput,
  type SeedPostInput,
  type SeedUserInput,
  type SeedCategoryInput,
} from '../seed/createBaseSeed'
export {
  createTestPayload,
  type CreateTestPayloadOptions,
  type CreateTestPayloadResult,
} from '../test/createTestPayload'

export { createLayoutExports, handleLocale, type CreateLayoutExportsOptions } from '../pages/createLayoutExports'
export {
  createCollectionPageExports,
  addCollectionsToSitemap,
  type MetadataOptions,
  type CreateCollectionPageExportsArgs,
  type CreateCollectionPageExportsDeps,
  type PageExtendProps,
  type JsonLdEntry,
  type JsonLdOutput,
} from '../pages/createCollectionPageExports'

export {
  createPagesCollection,
  type CreatePagesCollectionOptions,
} from '../collections/Pages/index'
export { createHeaderGlobal, type CreateHeaderGlobalOptions } from '../collections/globals/Header/config'
export { createFooterGlobal, type CreateFooterGlobalOptions } from '../collections/globals/Footer/config'
export { generatePreviewPath } from '../collections/previewPath'
export { HOME_PAGE_SLUG, pageSlugNestedDivider, PAGES_SLUG } from '../collections/Pages/index'

export default createWWWConfig
