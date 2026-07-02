import type { MetadataRoute } from 'next'

import { prefixFor } from '../_locale'
import { buildHreflangAlternates, type HreflangAlternates } from '../metadata/hreflang'
import { queryAllDocs, queryAllLocaleSlugs } from '../metadata/query'

export type CreateSitemapFileOptions = {
  /**
   * Collection slugs whose docs should appear in the sitemap. Each
   * collection must have a `slug` field on its documents. The lib
   * emits a single unified sitemap at `/sitemap.xml` listing every
   * doc from every configured collection across every active locale.
   */
  collections: string[]
  /**
   * The Payload config promise. The factory resolves it at request
   * time.
   */
  config: Promise<any>
  /**
   * The host's site URL — used to build absolute URLs.
   */
  getServerSideURL: () => string
  /**
   * Locale prefix mode. Mirrors next-intl's `localePrefix` so the
   * sitemap URLs match the host's actual route shape:
   *
   * - `'always'`: every URL is prefixed with `/{locale}/…`
   *   (e.g. `/en/about`, `/uk/about`). The default.
   * - `'as-needed'`: the default locale renders without a prefix
   *   (e.g. `/about`), other locales are prefixed (`/uk/about`).
   * - `'never'`: no locale prefix (only useful for single-locale
   *   sites or hosts that don't expose locales in the URL).
   *
   * The default locale is read from `config.localization.defaultLocale`
   * — the same single source of truth that next-intl and the rest of
   * the lib use.
   */
  localePrefix?: 'always' | 'as-needed' | 'never'
  /**
   * Optional filter for which locales to include in the sitemap.
   * Defaults to every locale declared in `config.localization.locales`.
   */
  locales?: string[]
  /**
   * Optional URL path prefix per collection. The Pages collection
   * lives at the root (`/about`) so it doesn't need a prefix, but
   * collections mounted under a sub-route (e.g. a posts collection
   * under `/posts/[...slug]`) need their URLs prefixed with `/posts`
   * so the sitemap entries match the actual route.
   *
   * Defaults to `''` (no prefix). Pass a value like `'/posts'`
   * (leading slash, no trailing slash) for a sub-routed collection.
   */
  urlPrefixes?: Record<string, string>
  /**
   * Optional priority / changeFrequency overrides per collection.
   */
  perCollection?: Record<string, { priority?: number; changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never' }>
  /**
   * Per-collection nested-slug flag. When a collection is marked
   * `true`, its stored `about_us` slug is expanded into the
   * `/about/us` URL path (and hreflang alternates), matching a
   * `createCollectionPageExports({ nested: true })` route. Defaults
   * to `false` (flat slugs) for every collection.
   */
  nested?: Record<string, boolean>
}

/**
 * A Next.js sitemap function for the host's
 * `app/(frontend)/sitemap.ts`. Returns the typed
 * `MetadataRoute.Sitemap` array — Next.js handles XML serialization.
 *
 * Usage — single unified sitemap:
 *
 *   // app/(frontend)/sitemap.ts
 *   import { createSitemapFile } from '@justanarthur/payload-www/render-utils'
 *   import configPromise from '@payload-config'
 *   import { getServerSideURL } from '@/utilities/getURL'
 *
 *   export default createSitemapFile({
 *     collections: ['pages', 'posts'],
 *     config: configPromise,
 *     getServerSideURL,
 *     localePrefix: 'as-needed',
 *     urlPrefixes: { posts: '/posts' }
 *   })
 *
 * The lib resolves the sitemap at request time, queries every
 * configured collection across every active locale, and emits one
 * unified `<urlset>` with full `alternates.languages` hreflang blocks
 * per URL. Google accepts up to 50,000 URLs per file.
 */
export type SitemapFunction = () => Promise<MetadataRoute.Sitemap>

export function createSitemapFile(options: CreateSitemapFileOptions): SitemapFunction {
  const { collections } = options

  return async function sitemap(): Promise<MetadataRoute.Sitemap> {
    console.log('[WWW] render/sitemap:createSitemapFile:sitemap collections=', JSON.stringify(options.collections), 'localePrefix=', options.localePrefix ?? 'always')
    const cfg = await options.config
    const allLocales: string[] = Array.isArray(cfg.localization?.locales)
      ? cfg.localization.locales.map((l: any) => (typeof l === 'string' ? l : l.code))
      : [cfg.localization?.defaultLocale ?? 'en']
    const defaultLocale: string = cfg.localization?.defaultLocale ?? allLocales[0]
    const activeLocales = Array.isArray(options.locales) && options.locales.length > 0
      ? options.locales.filter((l) => allLocales.includes(l))
      : allLocales
    console.log('[WWW] render/sitemap:createSitemapFile:sitemap allLocales=', JSON.stringify(allLocales), 'default=', defaultLocale, 'active=', JSON.stringify(activeLocales))

    const entries: MetadataRoute.Sitemap = []
    // Track (collection, locale, storedSlug) triples so the same doc
    // doesn't appear twice (the common case for non-localized slug
    // fields, where all locales resolve to the same slug).
    const seen = new Set<string>()

    for (const collectionSlug of collections) {
      const collectionDefaults = options.perCollection?.[collectionSlug] ?? {}
      const urlPrefix = (options.urlPrefixes?.[collectionSlug] ?? '').replace(/\/$/, '')
      const siteUrl = options.getServerSideURL().replace(/\/$/, '')
      const isNested = options.nested?.[collectionSlug] ?? false

      for (const locale of activeLocales) {
        const docs = await queryAllDocs({
          collectionSlug,
          slugField: 'slug',
          locale,
          config: options.config
        })
        for (const doc of docs) {
          const storedSlug = (doc as any).slug
          if (typeof storedSlug !== 'string' || storedSlug === '') continue

          const dedupeKey = `${collectionSlug}:${locale}:${storedSlug}`
          if (seen.has(dedupeKey)) continue
          seen.add(dedupeKey)

          // When nested, expand `about_us` → `about/us` for the URL.
          const slugPath = isNested ? storedSlug.replaceAll('_', '/') : storedSlug
          const url = `${siteUrl}${prefixFor(locale, defaultLocale, options.localePrefix ?? 'always')}${urlPrefix}/${slugPath}`

          // Full hreflang block per URL — respects `localePrefix`
          // so the default locale's `en` and `x-default` entries
          // match the canonical URL under `as-needed`.
          const languages = await buildHreflangAlternates({
            siteUrl,
            locale,
            urlPrefix,
            storedSlug,
            nested: isNested,
            homeSlug: '',
            defaultLocale,
            locales: activeLocales,
            localePrefix: options.localePrefix,
            queryAllLocaleSlugs: async (s, l) => {
              const result = await queryAllLocaleSlugs({
                collectionSlug,
                slug: s,
                slugField: 'slug',
                locale: l,
                config: options.config
              })
              return result ?? undefined
            }
          })

          entries.push({
            url,
            lastModified: doc.updatedAt ? new Date(doc.updatedAt as string) : undefined,
            changeFrequency: collectionDefaults.changefreq ?? 'weekly',
            priority: collectionDefaults.priority ?? 0.5,
            alternates: { languages: languages as HreflangAlternates }
          })
        }
      }
    }

    console.log('[WWW] render/sitemap:createSitemapFile:sitemap -> entries=', entries.length)
    return entries
  }
}
