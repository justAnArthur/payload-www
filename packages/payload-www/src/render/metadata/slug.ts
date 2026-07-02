const SLUG_NESTED_DIVIDER = '_'

export function segmentsToStoredSlug(segments: string[] | string, nested?: boolean): string {
  if (!Array.isArray(segments)) {
    console.log('[WWW] render/metadata:segmentsToStoredSlug string passthrough:', JSON.stringify(segments))
    return segments
  }
  const result = nested ? segments.join(SLUG_NESTED_DIVIDER) : segments[0] ?? ''
  console.log('[WWW] render/metadata:segmentsToStoredSlug nested=', nested, 'segments=', JSON.stringify(segments), '->', result)
  return result
}

export function segmentsToUrlPath(segments: string[] | string, nested?: boolean): string {
  let result: string
  if (!Array.isArray(segments)) result = '/' + segments
  else if (nested) result = '/' + segments.join('/')
  else result = '/' + (segments[0] ?? '')
  console.log('[WWW] render/metadata:segmentsToUrlPath nested=', nested, 'segments=', JSON.stringify(segments), '->', result)
  return result
}

export function storedSlugToSegments(storedSlug: string, nested?: boolean): string[] | string {
  const result = nested ? storedSlug.split(SLUG_NESTED_DIVIDER) : storedSlug
  console.log('[WWW] render/metadata:storedSlugToSegments nested=', nested, 'storedSlug=', storedSlug, '->', JSON.stringify(result))
  return result
}

export function buildCanonicalUrl<L extends string>({
                                                      siteUrl,
                                                      locale,
                                                      urlPrefix,
                                                      urlPath
                                                    }: {
  siteUrl: string
  locale: L
  urlPrefix: string
  urlPath: string
}): string {
  const trimmedPrefix = urlPrefix.replace(/^\/|\/$/g, '')
  const prefixSegment = trimmedPrefix ? `/${trimmedPrefix}` : ''
  const result = `${siteUrl}/${locale}${prefixSegment}${urlPath}`
  console.log('[WWW] render/metadata:buildCanonicalUrl siteUrl=', siteUrl, 'locale=', locale, 'urlPrefix=', urlPrefix, 'urlPath=', urlPath, '->', result)
  return result
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
