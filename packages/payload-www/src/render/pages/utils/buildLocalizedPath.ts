import type { RoutingConfig as GenericRoutingConfig } from "next-intl/routing"
import { slugToPath } from "../../metadata/slug"

export type RoutingConfig = GenericRoutingConfig<string[], any, any, any>

export function buildLocalizedPath(
  locale: string, prefix: string | undefined, slug: string | undefined, { routing }: { routing: RoutingConfig }
) {
  const path = slugToPath(slug)

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
    prefix
      ? '/' + prefix
      : ''
  }${
    path
      ? '/' + path
      : ''
  }`
}

export function buildLocalizedPaths(
  localesSlug: Record<string, string>,
  pagePathPrefix: string | undefined,
  { routing }: { routing: RoutingConfig }
) {
  if (!localesSlug[routing.defaultLocale])
    return {}

  return routing.locales.reduce((paths, locale) => {
    const slug = localesSlug[locale]

    if (!slug) return paths

    paths[locale] = buildLocalizedPath(locale, pagePathPrefix, slug, { routing })
    return paths
  }, {} as Record<string, string>)
}

export function buildAlternates(
  locale: string,
  ...args: [Record<string, string>, string | undefined, { routing: RoutingConfig, siteUrl: string }]
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
