// @justanarthur/payload-www/server
// Server-only surface. Anything that transitively imports `next/cache`,
// `next/headers`, `next/navigation`, `payload` runtime, `@payloadcms/*` runtime,
// or any `node:*` builtin lives here. The root `@justanarthur/payload-www`
// entry is kept client-safe so Next.js can analyze it for client bundles
// without choking on server-only deps.

import { createWWWConfig, type WWWConfigApi, type WWWConfigOptions, type WWWInputConfig } from '../config/createWWWConfig'
import { anyone, authenticated, authenticatedOrPublished } from '../core/access/index'
import {
  createRevalidateCollectionHook,
  createRevalidatePageHooks,
  type CreateRevalidateCollectionHookOptions,
  type CreateRevalidatePageHooksOptions
} from '../render/hooks/revalidateCollection'
import { createRevalidateGlobalHook } from '../render/hooks/revalidateGlobal'
import { appearanceOptions, link, type LinkAppearances, type LinkOptions } from '../core/fields/link'
import { linkGroup } from '../core/fields/linkGroup'
import { getFromImportMap } from '../core/utils/getFromImportMap'
import { generateImportName } from '../core/utils/generateImportName'
import { renderCollectionModule } from '../render/utils/renderCollectionModule'
import { renderGlobalModule } from '../render/utils/renderGlobalModule'
import { getCachedGlobal, type CachedGlobal } from '../render/utils/getCachedGlobal'
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
  queryDocBySlug,
  queryGlobal
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
  createStaticPageExports,
  type CreateStaticPageExportsArgs
} from '../render/pages/createStaticPageExports'
import {
  createPagesCollection,
  type CreatePagesCollectionOptions,
  HOME_PAGE_SLUG,
  PAGES_SLUG
} from '../data/collections/Pages/index'
import {
  createPostsCollection,
  type CreatePostsCollectionOptions,
  POSTS_SLUG
} from '../data/collections/Posts/index'
import {
  createStaticPagesCollection,
  type CreateStaticPagesCollectionOptions,
  STATIC_PAGES_SLUG
} from '../data/collections/StaticPages/index'
import { createHeaderGlobal, type CreateHeaderGlobalOptions } from '../data/collections/globals/Header/config'
import { createFooterGlobal, type CreateFooterGlobalOptions } from '../data/collections/globals/Footer/config'
import { generatePreviewPath } from '../data/collections/previewPath'

export { createWWWConfig, type WWWConfigOptions, type WWWConfigApi, type WWWInputConfig }
export { anyone, authenticated, authenticatedOrPublished }
export {
  createRevalidateCollectionHook,
  createRevalidatePageHooks,
  type CreateRevalidateCollectionHookOptions,
  type CreateRevalidatePageHooksOptions
}
export { createRevalidateGlobalHook }
export { appearanceOptions, link, type LinkAppearances, type LinkOptions }
export { linkGroup }
export { getFromImportMap }
export { generateImportName }
export { renderCollectionModule }
export { renderGlobalModule }
export { getCachedGlobal, type CachedGlobal }
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
export { getRenderModuleExports, queryAllDocs, queryAllLocaleSlugs, queryDocBySlug, queryGlobal }
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
  createStaticPageExports,
  type CreateStaticPageExportsArgs
}
export {
  createPagesCollection,
  type CreatePagesCollectionOptions,
  HOME_PAGE_SLUG,
  PAGES_SLUG
}
export {
  createPostsCollection,
  type CreatePostsCollectionOptions,
  POSTS_SLUG
}
export {
  createStaticPagesCollection,
  type CreateStaticPagesCollectionOptions,
  STATIC_PAGES_SLUG
}
export { createHeaderGlobal, type CreateHeaderGlobalOptions }
export { createFooterGlobal, type CreateFooterGlobalOptions }
export { generatePreviewPath }

export default createWWWConfig
