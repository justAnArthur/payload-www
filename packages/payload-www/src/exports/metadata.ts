import {
  type ArticleLdOptions,
  type BreadcrumbItem,
  buildArticleLd,
  buildBreadcrumbsLd
} from '../render/metadata/jsonld'
import {
  type BuildOrganizationLdOptions,
  type BuildProductLdOptions,
  type BuildRootJsonLdOptions,
  type BuildWebSiteLdOptions,
  buildOrganizationLd,
  buildProductLd,
  buildRootJsonLd,
  buildWebSiteLd
} from '@justanarthur/payload-plugin-seo/root-jsonld'
import { type SlugShape, isIndexSlug, paramsSlugToSlug, shapeHasIndexPath, slugToParamsSlug } from '../render/metadata/slug'
import {
  queryAllDocs,
  queryAllLocaleSlugs,
  queryDocByID,
  queryDocBySlug,
  queryGlobal,
  seedPayloadCache,
  tagsFor,
  type SeedPayloadCacheArgs,
} from '../render/metadata/query'

const metadata = {
  buildArticleLd,
  buildBreadcrumbsLd,
  buildOrganizationLd,
  buildWebSiteLd,
  buildProductLd,
  buildRootJsonLd,
  queryDocBySlug,
  queryDocByID,
  queryGlobal,
  queryAllDocs,
  queryAllLocaleSlugs,
  paramsSlugToSlug,
  slugToParamsSlug,
  isIndexSlug,
  shapeHasIndexPath,
  seedPayloadCache,
  tagsFor,
}

export default metadata
export {
  buildArticleLd,
  buildBreadcrumbsLd,
  buildOrganizationLd,
  buildWebSiteLd,
  buildProductLd,
  buildRootJsonLd,
  queryAllDocs,
  queryAllLocaleSlugs,
  queryDocByID,
  queryDocBySlug,
  queryGlobal,
  paramsSlugToSlug,
  slugToParamsSlug,
  isIndexSlug,
  shapeHasIndexPath,
  seedPayloadCache,
  tagsFor,
  type ArticleLdOptions,
  type BreadcrumbItem,
  type BuildOrganizationLdOptions,
  type BuildProductLdOptions,
  type BuildRootJsonLdOptions,
  type BuildWebSiteLdOptions,
  type SeedPayloadCacheArgs,
  type SlugShape,
}
