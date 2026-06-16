import {
  type ArticleLdOptions,
  type BreadcrumbItem,
  buildArticleLd,
  buildBreadcrumbsLd,
  buildOrganizationLd
} from '../render/metadata/jsonld'
import { buildHreflangAlternates } from '../render/metadata/hreflang'
import {
  buildCanonicalUrl,
  getUrlPath,
  segmentsToStoredSlug,
  segmentsToUrlPath,
  storedSlugToSegments
} from '../render/metadata/slug'
import { getRenderModuleExports, queryAllDocs, queryAllLocaleSlugs, queryDocBySlug } from '../render/metadata/query'

export default {
  buildArticleLd,
  buildBreadcrumbsLd,
  buildOrganizationLd,
  buildHreflangAlternates,
  queryDocBySlug,
  queryAllDocs,
  queryAllLocaleSlugs,
  getUrlPath,
  segmentsToStoredSlug,
  segmentsToUrlPath,
  storedSlugToSegments,
  buildCanonicalUrl,
  getRenderModuleExports
}

export {
  buildArticleLd,
  buildBreadcrumbsLd,
  buildCanonicalUrl,
  buildHreflangAlternates,
  buildOrganizationLd,
  getRenderModuleExports,
  getUrlPath,
  queryAllDocs,
  queryAllLocaleSlugs,
  queryDocBySlug,
  segmentsToStoredSlug,
  segmentsToUrlPath,
  storedSlugToSegments,
  type ArticleLdOptions,
  type BreadcrumbItem
}
