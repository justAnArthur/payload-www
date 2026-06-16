import type { WWWConfigApi, WWWConfigOptions, WWWInputConfig } from '../config/createWWWConfig'
import { createWWWConfig } from '../config/createWWWConfig'
import {
  anyone,
  authenticated,
  authenticatedOrPublished
} from '../core/access/index'
import { createRevalidatePageHooks, type RevalidatePageOptions } from '../core/hooks/revalidatePage'
import { createRevalidateGlobalHook, type RevalidateGlobalOptions } from '../core/hooks/revalidateGlobal'
import {
  createTranslateToOtherLocalesHook,
  type TranslateToOtherLocalesOptions
} from '../core/hooks/translateToOtherLocales'
import { populatePublishedAt } from '../core/hooks/populatePublishedAt'
import { appearanceOptions, link, type LinkAppearances, type LinkOptions } from '../core/fields/link'
import { linkGroup } from '../core/fields/linkGroup'
import { getFromImportMap } from '../core/utils/getFromImportMap'
import { generateImportName } from '../core/utils/generateImportName'
import { renderCollectionModule } from '../core/utils/renderCollectionModule'
import {
  buildArticleLd,
  buildBreadcrumbsLd,
  buildOrganizationLd,
  type ArticleLdOptions,
  type BreadcrumbItem
} from '../render/metadata/jsonld'
import { buildHreflangAlternates } from '../render/metadata/hreflang'
import {
  buildCanonicalUrl,
  getUrlPath,
  segmentsToStoredSlug,
  segmentsToUrlPath,
  storedSlugToSegments
} from '../render/metadata/slug'
import {
  getRenderModuleExports,
  queryAllDocs,
  queryAllLocaleSlugs,
  queryDocBySlug
} from '../render/metadata/query'
import { LivePreviewListener, type LivePreviewListenerProps } from '../render/components/LivePreviewListener'
import { RenderBlocks, type RenderBlocksProps } from '../core/blocks/renderBlocks'
import {
  createBaseSeed,
  type CreateBaseSeedOptions,
  type CreateBaseSeedResult,
  type SeedCategoryInput,
  type SeedPageInput,
  type SeedPostInput,
  type SeedUserInput
} from '../data/seed/createBaseSeed'
import { createTestPayload, type CreateTestPayloadOptions, type CreateTestPayloadResult } from '../data/test/createTestPayload'
import { createLayoutExports, handleLocale, type CreateLayoutExportsOptions } from '../render/pages/createLayoutExports'
import {
  addCollectionsToSitemap,
  createCollectionPageExports,
  type CreateCollectionPageExportsArgs,
  type CreateCollectionPageExportsDeps,
  type JsonLdEntry,
  type JsonLdOutput,
  type MetadataOptions,
  type PageExtendProps
} from '../render/pages/createCollectionPageExports'
import {
  createPagesCollection,
  type CreatePagesCollectionOptions,
  HOME_PAGE_SLUG,
  PAGES_SLUG,
  pageSlugNestedDivider
} from '../data/collections/Pages/index'
import { createHeaderGlobal, type CreateHeaderGlobalOptions } from '../data/collections/globals/Header/config'
import { createFooterGlobal, type CreateFooterGlobalOptions } from '../data/collections/globals/Footer/config'
import { generatePreviewPath } from '../data/collections/previewPath'

export { createWWWConfig, type WWWConfigOptions, type WWWConfigApi, type WWWInputConfig }
export { anyone, authenticated, authenticatedOrPublished }
export { createRevalidatePageHooks, type RevalidatePageOptions }
export { createRevalidateGlobalHook, type RevalidateGlobalOptions }
export { createTranslateToOtherLocalesHook, type TranslateToOtherLocalesOptions }
export { populatePublishedAt }
export { appearanceOptions, link, type LinkAppearances, type LinkOptions }
export { linkGroup }
export { getFromImportMap }
export { generateImportName }
export { renderCollectionModule }
export {
  buildArticleLd,
  buildBreadcrumbsLd,
  buildOrganizationLd,
  type ArticleLdOptions,
  type BreadcrumbItem
}
export { buildHreflangAlternates }
export {
  buildCanonicalUrl,
  getUrlPath,
  segmentsToStoredSlug,
  segmentsToUrlPath,
  storedSlugToSegments
}
export { getRenderModuleExports, queryAllDocs, queryAllLocaleSlugs, queryDocBySlug }
export { LivePreviewListener, type LivePreviewListenerProps }
export { RenderBlocks, type RenderBlocksProps }
export {
  createBaseSeed,
  type CreateBaseSeedOptions,
  type CreateBaseSeedResult,
  type SeedCategoryInput,
  type SeedPageInput,
  type SeedPostInput,
  type SeedUserInput
}
export { createTestPayload, type CreateTestPayloadOptions, type CreateTestPayloadResult }
export { createLayoutExports, handleLocale, type CreateLayoutExportsOptions }
export {
  addCollectionsToSitemap,
  createCollectionPageExports,
  type CreateCollectionPageExportsArgs,
  type CreateCollectionPageExportsDeps,
  type JsonLdEntry,
  type JsonLdOutput,
  type MetadataOptions,
  type PageExtendProps
}
export {
  createPagesCollection,
  type CreatePagesCollectionOptions,
  HOME_PAGE_SLUG,
  PAGES_SLUG,
  pageSlugNestedDivider
}
export { createHeaderGlobal, type CreateHeaderGlobalOptions }
export { createFooterGlobal, type CreateFooterGlobalOptions }
export { generatePreviewPath }

export default createWWWConfig
