import {
  buildArticleLd,
  type ArticleLdOptions,
} from '../metadata/jsonld'
import {
  buildBreadcrumbsLd,
  buildOrganizationLd,
  type BreadcrumbItem,
} from '../metadata/jsonld'
import { buildHreflangAlternates } from '../metadata/hreflang'
import {
  getUrlPath,
  segmentsToStoredSlug,
  segmentsToUrlPath,
  storedSlugToSegments,
  buildCanonicalUrl,
} from '../metadata/slug'
import {
  queryDocBySlug,
  queryAllDocs,
  queryAllLocaleSlugs,
  getRenderModuleExports,
} from '../metadata/query'

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
  getRenderModuleExports,
}

export {
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
  getRenderModuleExports,
  type ArticleLdOptions,
  type BreadcrumbItem,
}
