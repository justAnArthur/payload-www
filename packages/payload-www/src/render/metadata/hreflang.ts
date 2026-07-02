/**
 * Hreflang alternate URLs as a `lang → url` map. Always includes an
 * `'x-default'` entry pointing at the default locale's URL.
 */
export type HreflangAlternates = Record<string, string>

export async function buildHreflangAlternates<L extends string>({
                                                                  siteUrl,
                                                                  locale,
                                                                  urlPrefix,
                                                                  storedSlug,
                                                                  queryAllLocaleSlugs,
                                                                  nested,
                                                                  homeSlug,
                                                                  defaultLocale,
                                                                  locales,
                                                                  localePrefix = 'always'
                                                                }: {
  siteUrl: string
  locale: L
  urlPrefix: string
  storedSlug: string
  queryAllLocaleSlugs: (slug: string, locale: L) => Promise<Partial<Record<L, string>> | undefined>
  nested: boolean
  homeSlug: string
  defaultLocale: L
  locales: readonly L[]
  /**
   * Locale prefix mode — mirrors next-intl's `localePrefix` so each
   * alternate URL matches the host's actual route shape:
   *
   * - `'always'`: every URL is prefixed with `/{locale}/…`
   *   (e.g. `/en/about`, `/uk/about`). The default — preserves
   *   the helper's prior behavior.
   * - `'as-needed'`: the default locale renders without a prefix
   *   (e.g. `/about`), other locales are prefixed (`/uk/about`).
   *   Critical: callers that emit hreflang alongside a canonical
   *   URL built with `as-needed` mode MUST pass this through,
   *   otherwise the `en` and `x-default` alternates point to URLs
   *   the host doesn't actually serve.
   * - `'never'`: no locale prefix at all.
   */
  localePrefix?: 'always' | 'as-needed' | 'never'
}): Promise<Record<string, string>> {
  const allLocaleSlugs = await queryAllLocaleSlugs(storedSlug, locale)
  console.log('[WWW] render/metadata:buildHreflangAlternates storedSlug=', storedSlug, 'locale=', locale, 'allLocaleSlugs=', JSON.stringify(allLocaleSlugs))
  const languages: Record<string, string> = {}

  // Build a URL for a given locale's slug, applying the locale
  // prefix mode. Inlined here (instead of reusing `buildCanonicalUrl`)
  // because `buildCanonicalUrl` always prepends `/${locale}` —
  // which is wrong under `as-needed` / `never` modes.
  const urlFor = (l: L, slug: string): string => {
    const trimmedPrefix = urlPrefix.replace(/^\/|\/$/g, '')
    const prefixSegment = trimmedPrefix ? `/${trimmedPrefix}` : ''
    const urlPath =
      slug === homeSlug
        ? '/'
        : nested
          ? '/' + slug.replaceAll('_', '/')
          : '/' + slug
    const localeSegment =
      localePrefix === 'never'
        ? ''
        : localePrefix === 'as-needed' && l === defaultLocale
          ? ''
          : `/${l}`
    return `${siteUrl}${localeSegment}${prefixSegment}${urlPath}`
  }

  for (const l of locales) {
    const slugForLocale = allLocaleSlugs?.[l]
    if (!slugForLocale) continue
    languages[l] = urlFor(l, slugForLocale)
  }

  if (allLocaleSlugs?.[defaultLocale]) {
    languages['x-default'] = urlFor(defaultLocale, allLocaleSlugs[defaultLocale])
  }

  console.log('[WWW] render/metadata:buildHreflangAlternates ->', JSON.stringify(languages))
  return languages
}
