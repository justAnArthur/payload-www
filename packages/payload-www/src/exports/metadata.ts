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
import { type SlugShape, paramsSlugToSlug, slugToParamsSlug } from '../render/metadata/slug'
import {
  queryAllDocs,
  queryAllLocaleSlugs,
  queryDocBySlug,
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
  queryAllDocs,
  queryAllLocaleSlugs,
  paramsSlugToSlug,
  slugToParamsSlug,
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
  queryDocBySlug,
  paramsSlugToSlug,
  slugToParamsSlug,
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
