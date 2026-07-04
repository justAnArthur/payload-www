import { type ArticleLdOptions, type BreadcrumbItem, buildArticleLd, buildBreadcrumbsLd, buildOrganizationLd } from '../render/metadata/jsonld'
import { paramsSlugToSlug, slugToParamsSlug } from '../render/metadata/slug'
import { queryAllDocs, queryAllLocaleSlugs, queryDocBySlug } from '../render/metadata/query'

const metadata = { buildArticleLd, buildBreadcrumbsLd, buildOrganizationLd, queryDocBySlug, queryAllDocs, queryAllLocaleSlugs, paramsSlugToSlug, slugToParamsSlug }

export default metadata
export { buildArticleLd, buildBreadcrumbsLd, buildOrganizationLd, queryAllDocs, queryAllLocaleSlugs, queryDocBySlug, paramsSlugToSlug, slugToParamsSlug, type ArticleLdOptions, type BreadcrumbItem }
