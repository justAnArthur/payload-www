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

// the index document carries no slug — an untranslated locale stores null rather than ''
export function isIndexSlug(slug: string | null | undefined): boolean {
  return !slug
}

// only an optional catch-all can address the index; a required [slug] segment is never empty
export function shapeHasIndexPath(shape: SlugShape): boolean {
  return shape === 'catch-all'
}

export function slugToPath(slug: string | undefined): string {
  if (!slug) return ''
  return slug.split(SLUG_NESTED_DIVIDER).join('/')
}
