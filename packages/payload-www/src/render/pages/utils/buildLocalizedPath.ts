// ponytail: next-intl's `RoutingConfig` requires `pathnames` even though
// most hosts (acadsys-www, camasys) don't use it. Define a structural
// subset of RoutingConfig that omits `pathnames` and is assignable from
// `defineRouting({...})` outputs regardless of which optional fields the
// host fills in.
export type RoutingConfig = {
  locales: readonly string[]
  defaultLocale: string
  localePrefix?: 'always' | 'as-needed' | 'never' | { mode: 'always' | 'as-needed' | 'never'; prefixes?: Partial<Record<string, string>> }
  localeDetection?: boolean
  domains?: unknown
  localeCookie?: unknown
  alternateLinks?: boolean
}

export function buildLocalizedPath(
  locale: string, prefix: string | undefined, slug: string | undefined, { routing }: { routing: RoutingConfig }
) {
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
    slug
      ? '/' + slug
      : ''
  }`
}

export function buildLocalizedPaths(
  localesSlug: Record<string, string>,
  pagePathPrefix: string | undefined,
  { routing }: { routing: RoutingConfig }
) {
  return routing.locales.reduce((paths, locale) => {
    const slug = localesSlug[locale]

    paths[locale] = buildLocalizedPath(locale, pagePathPrefix, slug, { routing })
    return paths
  }, {} as Record<string, string>)
}

export function buildAlternates(
  locale: string,
  ...args: [Record<string, string>, string | undefined, { routing: RoutingConfig, siteUrl: string }]
) {
  const siteUrl = args[2].siteUrl

  let localizedPaths = buildLocalizedPaths(...args)
  localizedPaths['x-default'] = localizedPaths[args[2].routing.defaultLocale]

  localizedPaths = Object.fromEntries(Object.entries(localizedPaths).map(([key, value]) =>
    [key, siteUrl + localizedPaths[key]]))

  return ({
    languages: localizedPaths,
    canonical: localizedPaths[locale]
  })
}
