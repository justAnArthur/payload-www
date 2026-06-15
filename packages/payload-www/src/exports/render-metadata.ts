import {
  buildArticleLd,
  type ArticleLdOptions,
  type BreadcrumbItem,
  buildBreadcrumbsLd,
  buildOrganizationLd,
} from '../render/metadata/jsonld'
import { buildHreflangAlternates } from '../render/metadata/hreflang'
import {
  getUrlPath,
  segmentsToStoredSlug,
  segmentsToUrlPath,
  storedSlugToSegments,
  buildCanonicalUrl,
} from '../render/metadata/slug'
import {
  queryDocBySlug,
  queryAllDocs,
  queryAllLocaleSlugs,
  getRenderModuleExports,
} from '../render/metadata/query'

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
} from '../render/metadata/index'
