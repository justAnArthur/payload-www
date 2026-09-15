import type { RoutingConfig as GenericRoutingConfig } from "next-intl/routing"
import { slugToPath } from "../../metadata/slug"

export type RoutingConfig = GenericRoutingConfig<string[], any, any, any>

/**
 * URL segment a collection is mounted under. A string is used for every locale; a record
 * localizes it (`{ en: 'posts', sk: 'prispevky' }`), so a host serving localized routes
 * gets canonical/hreflang URLs that match the URLs it actually serves. Locales missing
 * from the record fall back to the default locale.
 */
export type PagePathPrefix = string | Record<string, string>

export function resolvePagePathPrefix(
  prefix: PagePathPrefix | undefined, locale: string, routing: RoutingConfig
) {
  if (typeof prefix !== 'object') return prefix
  return prefix[locale] ?? prefix[routing.defaultLocale]
}

export function buildLocalizedPath(
  locale: string, prefix: PagePathPrefix | undefined, slug: string | undefined, { routing }: { routing: RoutingConfig }
) {
  const path = slugToPath(slug)
  const localePrefix = resolvePagePathPrefix(prefix, locale, routing)

  return `${
    routing.localePrefix === 'never'
      ? ''
      : routing.localePrefix === 'always'
        ? locale
        : routing.localePrefix === 'as-needed'
          ? locale === routing.defaultLocale
            ? ''
            : '/' + locale
          : (() => {
            throw new Error('Unsupported locale prefix')
          })()
  }${
    localePrefix
      ? '/' + localePrefix
      : ''
  }${
    path
      ? '/' + path
      : ''
  }`
}

export function buildLocalizedPaths(
  localesSlug: Record<string, string>,
  pagePathPrefix: PagePathPrefix | undefined,
  { routing }: { routing: RoutingConfig }
) {
  // a blank slug means the doc isn't translated in that locale, and letting it
  // through collapses the path onto the collection listing. the home page is the
  // exception — it's addressed by its locale prefix alone, so every locale is
  // blank there and dropping them would leave it with no alternates at all
  const blankIsHome = !localesSlug[routing.defaultLocale]

  return routing.locales.reduce((paths, locale) => {
    const slug = localesSlug[locale]

    if (!slug && !blankIsHome) return paths

    paths[locale] = buildLocalizedPath(locale, pagePathPrefix, slug, { routing })
    return paths
  }, {} as Record<string, string>)
}

export function buildAlternates(
  locale: string,
  ...args: [Record<string, string>, PagePathPrefix | undefined, { routing: RoutingConfig, siteUrl: string }]
) {
  const [localesSlug, pagePathPrefix, { routing, siteUrl }] = args

  const localizedPaths = buildLocalizedPaths(...args)

  const defaultPath = localizedPaths[routing.defaultLocale]
  if (defaultPath !== undefined) localizedPaths['x-default'] = defaultPath

  const canonical = localizedPaths[locale]
    ?? buildLocalizedPath(locale, pagePathPrefix, localesSlug[locale], { routing })

  return ({
    languages: Object.fromEntries(Object.entries(localizedPaths).map(([key, value]) =>
      [key, siteUrl + value])),
    canonical: siteUrl + canonical
  })
}
