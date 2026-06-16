// @justanarthur/payload-www/server
// Server-only surface. Anything that transitively imports `next/cache`,
// `next/headers`, `next/navigation`, `payload` runtime, `@payloadcms/*` runtime,
// or any `node:*` builtin lives here. The root `@justanarthur/payload-www`
// entry is kept client-safe so Next.js can analyze it for client bundles
// without choking on server-only deps.
//
// Rule: root has only `LivePreviewListener` (the one client component using
// useState/useEffect via `useRouter`). Everything else — RenderBlocks,
// createWWWConfig, all hooks, all collections, all pages, all utils — lives
// here.

import { createWWWConfig, type WWWConfigApi, type WWWConfigOptions, type WWWInputConfig } from '../config/createWWWConfig'
import { anyone, authenticated, authenticatedOrPublished } from '../core/access/index'
import { createRevalidatePageHooks, type RevalidatePageOptions } from '../render/hooks/revalidatePage'
import { createRevalidateGlobalHook, type RevalidateGlobalOptions } from '../render/hooks/revalidateGlobal'
import { createTranslateToOtherLocalesHook, type TranslateToOtherLocalesOptions } from '../core/hooks/translateToOtherLocales'
import { populatePublishedAt } from '../core/hooks/populatePublishedAt'
import { appearanceOptions, link, type LinkAppearances, type LinkOptions } from '../core/fields/link'
import { linkGroup } from '../core/fields/linkGroup'
import { getFromImportMap } from '../core/utils/getFromImportMap'
import { generateImportName } from '../core/utils/generateImportName'
import { renderCollectionModule } from '../render/utils/renderCollectionModule'
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
import { RenderBlocks, type RenderBlocksProps } from '../render/blocks/renderBlocks'
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
