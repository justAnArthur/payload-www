const SLUG_NESTED_DIVIDER = '_'

export type SlugShape = 'single' | 'catch-all'

export function paramsSlugToSlug(
  slug: string | string[] | undefined,
  _shape: SlugShape
): string {
  if (!slug) return ''
  return (Array.isArray(slug) ? slug : [slug]).join(SLUG_NESTED_DIVIDER)
}

export function slugToParamsSlug(
  slug: string,
  shape: SlugShape
): string | string[] {
  if (!slug) return shape === 'catch-all' ? [] : ''
  return shape === 'catch-all' ? slug.split(SLUG_NESTED_DIVIDER) : slug
}