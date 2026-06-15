import { createWWWConfig } from '../config/createWWWConfig'

export { createWWWConfig, type WWWConfigOptions, type WWWConfigApi, type WWWInputConfig } from '../config/createWWWConfig'

export { anyone, authenticated, authenticatedOrPublished } from '../core/access/index'
export {
  createRevalidatePageHooks,
  type RevalidatePageOptions,
} from '../core/hooks/revalidatePage'
export { createRevalidateGlobalHook, type RevalidateGlobalOptions } from '../core/hooks/revalidateGlobal'
export {
  createTranslateToOtherLocalesHook,
  type TranslateToOtherLocalesOptions,
} from '../core/hooks/translateToOtherLocales'
export { populatePublishedAt } from '../core/hooks/populatePublishedAt'

export { link, appearanceOptions, type LinkAppearances, type LinkOptions } from '../core/fields/link'
export { linkGroup } from '../core/fields/linkGroup'

export { getFromImportMap } from '../core/utils/getFromImportMap'
export { generateImportName } from '../core/utils/generateImportName'
export { renderCollectionModule } from '../core/utils/renderCollectionModule'

export {
  buildArticleLd,
  buildBreadcrumbsLd,
  buildOrganizationLd,
  type ArticleLdOptions,
  type BreadcrumbItem,
} from '../render/metadata/jsonld'
export { buildHreflangAlternates } from '../render/metadata/hreflang'
export {
  getUrlPath,
  segmentsToStoredSlug,
  segmentsToUrlPath,
  storedSlugToSegments,
  buildCanonicalUrl,
} from '../render/metadata/slug'
export {
  queryDocBySlug,
  queryAllDocs,
  queryAllLocaleSlugs,
  getRenderModuleExports,
} from '../render/metadata/query'

export { LivePreviewListener, type LivePreviewListenerProps } from '../render/components/index'
export { RenderBlocks, type RenderBlocksProps } from '../core/blocks/renderBlocks'

export {
  createBaseSeed,
  type CreateBaseSeedOptions,
  type CreateBaseSeedResult,
  type SeedPageInput,
  type SeedPostInput,
  type SeedUserInput,
  type SeedCategoryInput,
} from '../data/seed/createBaseSeed'
export {
  createTestPayload,
  type CreateTestPayloadOptions,
  type CreateTestPayloadResult,
} from '../data/test/createTestPayload'

export { createLayoutExports, handleLocale, type CreateLayoutExportsOptions } from '../render/pages/createLayoutExports'
export {
  createCollectionPageExports,
  addCollectionsToSitemap,
  type MetadataOptions,
  type CreateCollectionPageExportsArgs,
  type CreateCollectionPageExportsDeps,
  type PageExtendProps,
  type JsonLdEntry,
  type JsonLdOutput,
} from '../render/pages/createCollectionPageExports'

export {
  createPagesCollection,
  type CreatePagesCollectionOptions,
} from '../data/collections/Pages/index'
export { createHeaderGlobal, type CreateHeaderGlobalOptions } from '../data/collections/globals/Header/config'
export { createFooterGlobal, type CreateFooterGlobalOptions } from '../data/collections/globals/Footer/config'
export { generatePreviewPath } from '../data/collections/previewPath'
export { HOME_PAGE_SLUG, pageSlugNestedDivider, PAGES_SLUG } from '../data/collections/Pages/index'

export default createWWWConfig
