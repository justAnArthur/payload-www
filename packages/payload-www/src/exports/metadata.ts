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
import { queryAllLocaleSlugs, getRenderModuleExports, queryAllDocs, queryDocBySlug } from '../render/metadata/query'

export default {
  buildArticleLd,
  buildBreadcrumbsLd,
  buildOrganizationLd,
  buildHreflangAlternates: buildLocalizedPaths,
  queryDocBySlug,
  queryAllDocs,
  queryAllLocaleSlugs: queryAllLocaleSlugs,
  getUrlPath,
  segmentsToStoredSlug: paramsSlugToSlug,
  segmentsToUrlPath,
  storedSlugToSegments: slugToParamsSlug,
  buildCanonicalUrl,
  getRenderModuleExports
}

export {
  buildArticleLd,
  buildBreadcrumbsLd,
  buildCanonicalUrl,
  buildLocalizedPaths,
  buildOrganizationLd,
  getRenderModuleExports,
  getUrlPath,
  queryAllDocs,
  queryAllLocaleSlugs,
  queryDocBySlug,
  paramsSlugToSlug,
  segmentsToUrlPath,
  slugToParamsSlug,
  type ArticleLdOptions,
  type BreadcrumbItem
}
