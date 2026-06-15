import { buildCanonicalUrl } from './slug'

export async function buildHreflangAlternates<L extends string>({
                                                                  siteUrl,
                                                                  locale,
                                                                  urlPrefix,
                                                                  storedSlug,
                                                                  queryAllLocaleSlugs,
                                                                  nested,
                                                                  homeSlug,
                                                                  defaultLocale,
                                                                  locales
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
}): Promise<Record<string, string>> {
  const allLocaleSlugs = await queryAllLocaleSlugs(storedSlug, locale)
  const languages: Record<string, string> = {}

  for (const l of locales) {
    const slugForLocale = allLocaleSlugs?.[l]
    if (!slugForLocale) continue

    const urlPath =
      slugForLocale === homeSlug
        ? '/'
        : nested
          ? '/' + slugForLocale.replaceAll('_', '/')
          : '/' + slugForLocale

    languages[l] = buildCanonicalUrl({ siteUrl, locale: l, urlPrefix, urlPath })
  }

  if (allLocaleSlugs?.[defaultLocale]) {
    languages['x-default'] = buildCanonicalUrl({
      siteUrl,
      locale: defaultLocale,
      urlPrefix,
      urlPath:
        allLocaleSlugs[defaultLocale] === homeSlug
          ? '/'
          : nested
            ? '/' + allLocaleSlugs[defaultLocale].replaceAll('_', '/')
            : '/' + allLocaleSlugs[defaultLocale]
    })
  }

  return languages
}
