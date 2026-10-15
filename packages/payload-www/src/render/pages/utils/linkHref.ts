import { buildLocalizedPath, type PagePathPrefix, type RoutingConfig } from './buildLocalizedPath'

type LinkValue = {
  type?: string | null
  url?: string | null
  reference?: unknown
}

export type LinkHrefOptions = {
  /** The locale being rendered. With `routing`, internal links carry its prefix. */
  locale?: string
  /** The routing the page is served with — rendered modules get it as their `routing` prop. */
  routing?: RoutingConfig
  /** URL segment per collection an internal link may point at, e.g. `{ posts: 'posts' }`. */
  pagePathPrefixes?: Record<string, PagePathPrefix>
}

const NO_PREFIX = { locales: [], defaultLocale: '', localePrefix: 'never' } as unknown as RoutingConfig

/**
 * The href of a `link()` field value. Internal links resolve to the referenced doc's path in
 * `locale`, prefixed per `routing` (no prefix for the default locale under `as-needed`). Custom
 * URLs are returned as typed. `undefined` when the link points nowhere (e.g. an unpopulated id).
 */
export function linkHref(link: LinkValue | null | undefined, { locale, routing, pagePathPrefixes = {} }: LinkHrefOptions = {}): string | undefined {
  if (!link) return undefined
  if (link.type === 'custom') return typeof link.url === 'string' ? link.url : undefined

  const ref = link.reference as { relationTo?: string; value?: unknown; slug?: unknown } | null | undefined
  if (!ref || typeof ref !== 'object') return undefined

  // `relationTo` with several collections stores `{ relationTo, value }`; a single one stores the doc itself
  const polymorphic = typeof ref.relationTo === 'string' && 'value' in ref
  const doc = (polymorphic ? ref.value : ref) as { slug?: unknown } | null | undefined
  if (!doc || typeof doc !== 'object' || (doc.slug != null && typeof doc.slug !== 'string')) return undefined

  const prefix = polymorphic ? pagePathPrefixes[ref.relationTo as string] : undefined
  const useRouting = routing && locale ? routing : NO_PREFIX

  return buildLocalizedPath(locale ?? '', prefix, (doc.slug as string | null) ?? '', { routing: useRouting }) || '/'
}
