const SLUG_NESTED_DIVIDER = '_'

export function segmentsToStoredSlug(segments: string[] | string, nested?: boolean): string {
  if (!Array.isArray(segments)) return segments
  if (nested) return segments.join(SLUG_NESTED_DIVIDER)
  return segments[0] ?? ''
}

export function segmentsToUrlPath(segments: string[] | string, nested?: boolean): string {
  if (!Array.isArray(segments)) return '/' + segments
  if (nested) return '/' + segments.join('/')
  return '/' + (segments[0] ?? '')
}

export function storedSlugToSegments(storedSlug: string, nested?: boolean): string[] | string {
  if (nested) return storedSlug.split(SLUG_NESTED_DIVIDER)
  return storedSlug
}

export function buildCanonicalUrl<L extends string>({
  siteUrl,
  locale,
  urlPrefix,
  urlPath,
}: {
  siteUrl: string
  locale: L
  urlPrefix: string
  urlPath: string
}): string {
  const prefix = urlPrefix.replace(/\/$/, '')
  return `${siteUrl}/${locale}${prefix}${urlPath}`
}

export function getUrlPath(segments: string[] | string, nested: boolean, homeSlug: string): string {
  const urlPath = segmentsToUrlPath(segments, nested)
  if (nested && !Array.isArray(segments)) {
    if (segments === homeSlug) return '/'
  } else if (nested && Array.isArray(segments)) {
    const stored = segments.join(SLUG_NESTED_DIVIDER)
    if (stored === homeSlug) return '/'
  }
  return urlPath
}
