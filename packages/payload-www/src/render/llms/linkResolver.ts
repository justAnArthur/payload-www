import type { PagePathPrefix, RoutingConfig } from '../pages/utils/buildLocalizedPath'
import { linkHref } from '../pages/utils/linkHref'
import type { ResolveLink } from './fieldsToMarkdown'

export type LinkResolverArgs = {
  siteUrl: string
  /** Locale of the document being serialized; internal links get its prefix. */
  locale: string
  routing: RoutingConfig
  /** URL segment per collection, as the page exports were given it. */
  pathPrefixes: Record<string, PagePathPrefix | undefined>
  /**
   * Canonical URLs by `<collection>:<id>`. References are stored as bare ids at depth 0 (the
   * llms.txt listing), so they resolve through the URLs the listing already computed.
   */
  urlsById?: Map<string, string>
}

const SCHEME = /^(?:https?:|mailto:|tel:)/i

/** Resolves `link()` values to absolute URLs: custom URLs as typed (root-relative ones on `siteUrl`), internal ones by the referenced document. */
export function createLinkResolver({ siteUrl, locale, routing, pathPrefixes, urlsById }: LinkResolverArgs): ResolveLink {
  const prefixes = Object.fromEntries(
    Object.entries(pathPrefixes).filter((entry): entry is [string, PagePathPrefix] => entry[1] !== undefined)
  )
  const onSite = (path: string) => path === '/' ? siteUrl : siteUrl + path

  return link => {
    if (link.type === 'custom') {
      const url = typeof link.url === 'string' ? link.url.trim() : ''
      if (SCHEME.test(url)) return url
      // an in-page anchor or a relative path means nothing outside the page it sits on
      return url.startsWith('/') && !url.startsWith('//') ? onSite(url) : undefined
    }

    const href = linkHref(link, { locale, routing, pagePathPrefixes: prefixes })
    if (href) return onSite(href)

    if (!urlsById) return undefined
    const ref = link.reference as { relationTo?: unknown; value?: unknown } | number | string | null | undefined
    if (ref && typeof ref === 'object' && typeof ref.relationTo === 'string')
      return urlsById.get(`${ref.relationTo}:${idOf(ref.value)}`)
    // a single-collection relationship stores the id alone: take it only when no other collection shares it
    const id = idOf(ref)
    if (id === undefined) return undefined
    const matches = [...urlsById].filter(([key]) => key.endsWith(`:${id}`))
    return matches.length === 1 ? matches[0][1] : undefined
  }
}

function idOf(value: unknown): string | undefined {
  if (typeof value === 'number' || typeof value === 'string') return String(value)
  if (value && typeof value === 'object' && 'id' in value) return idOf((value as { id: unknown }).id)
  return undefined
}
