const SLUG_NESTED_DIVIDER = '_'

export function paramsSlugToSlug(slug: string[] | string) {
  if (!slug) return ''
  return (Array.isArray(slug) ? slug : [slug]).join(SLUG_NESTED_DIVIDER)
}

export function slugToParamsSlug(slug: string) {
  if (!slug) return undefined
  return slug.split(SLUG_NESTED_DIVIDER)
}
