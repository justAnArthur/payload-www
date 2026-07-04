import { RoutingConfig as GenericRoutingConfig } from "next-intl/routing"

export type RoutingConfig = GenericRoutingConfig<string[], any, any, any>

export function buildLocalizedPath(
  locale: string, prefix: string | undefined, slug: string, { routing }: { routing: RoutingConfig }
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
  localesSlug: Record<string, string>, pagePathPrefix: string | undefined, { routing }: { routing: RoutingConfig }
) {
  return routing.locales.reduce((paths, locale) => {
    const slug = localesSlug[locale]

    if (!slug)
      return paths

    paths[locale] = buildLocalizedPath(locale, pagePathPrefix, (slug), { routing })
    return paths
  }, {} as Record<string, string>)
}

export function buildAlternates(locale: string, ...args: Parameters<typeof buildLocalizedPaths>) {
  const localizedPaths = buildLocalizedPaths(...args)
  localizedPaths['x-default'] = localizedPaths[args[2].routing.defaultLocale]

  return ({
    languages: localizedPaths,
    canonical: localizedPaths[locale]
  })
}
