import {
  createWWWConfig,
  type WWWConfigApi,
  type WWWConfigOptions,
  type WWWInputConfig
} from '../createWWWConfig'
import { anyone, authenticated, authenticatedOrPublished } from '../collections/access/index'
import {
  createRevalidateCollectionHook,
  type CreateRevalidateCollectionHookOptions,
  createRevalidatePageHooks,
  type CreateRevalidatePageHooksOptions
} from '../collections/hooks/revalidateCollection'
import { createRevalidateGlobalHook } from '../collections/hooks/revalidateGlobal'
import { appearanceOptions, link, type LinkAppearances, type LinkOptions } from '../collections/fields/link'
import { linkGroup } from '../collections/fields/linkGroup'
import { getFromImportMap } from '../render/getFromImportMap'
import { generateImportName } from '../render/generateImportName'
import { renderCollectionModule } from '../render/utils/renderCollectionModule'
import { renderGlobalModule } from '../render/utils/renderGlobalModule'
import { type CachedGlobal, getCachedGlobal } from '../render/utils/getCachedGlobal'
import {
  type ArticleLdOptions,
  type BreadcrumbItem,
  buildArticleLd,
  buildBreadcrumbsLd,
  buildOrganizationLd
} from '../render/metadata/jsonld'
import { buildLocalizedPaths } from '../render/metadata/hreflang'
import {
  buildCanonicalUrl,
  getUrlPath,
  paramsSlugToSlug,
  segmentsToUrlPath,
  slugToParamsSlug
} from '../render/metadata/slug'
import {
  queryAllLocaleSlugs,
  getRenderModuleExports,
  queryAllDocs,
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
import {
  createTestPayload,
  type CreateTestPayloadOptions,
  type CreateTestPayloadResult
} from '../data/test/createTestPayload'
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
import { createStaticPageExports, type CreateStaticPageExportsArgs } from '../render/pages/createStaticPageExports'
import {
  createPagesCollection,
  type CreatePagesCollectionOptions,
  HOME_PAGE_SLUG,
  PAGES_SLUG
} from '../collections/Pages/index'
import { createPostsCollection, type CreatePostsCollectionOptions, POSTS_SLUG } from '../collections/Posts/index'
import {
  createStaticPagesCollection,
  type CreateStaticPagesCollectionOptions,
  STATIC_PAGES_SLUG
} from '../collections/StaticPages/index'
import { createHeaderGlobal, type CreateHeaderGlobalOptions } from '../collections/globals/Header/config'
import { createFooterGlobal, type CreateFooterGlobalOptions } from '../collections/globals/Footer/config'
import { generatePreviewPath } from '../collections/previewPath'

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
export { buildLocalizedPaths }
export {
  buildCanonicalUrl,
  getUrlPath,
  paramsSlugToSlug,
  segmentsToUrlPath,
  slugToParamsSlug
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
