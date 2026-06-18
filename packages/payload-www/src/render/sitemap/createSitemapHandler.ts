import { queryAllDocs } from '../metadata/query'

export type CreateSitemapHandlerOptions = {
  /**
   * Collection slugs whose docs should appear in the sitemap. Each
   * collection must have a `slug` field on its documents.
   */
  collections: string[]
  /**
   * The Payload config promise. The handler resolves it at request
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
   *
   * If the route is mounted at `app/[locale]/…-sitemap.xml/route.ts`,
   * the route's dynamic `[locale]` segment takes precedence: the
   * handler restricts the sitemap to that single locale automatically.
   */
  locales?: string[]
  /**
   * Per-collection revalidation tag. The lib's Pages revalidation
   * hook revalidates this tag, so a page save refreshes the sitemap.
   * Default: `'pages-sitemap'`.
   */
  sitemapTag?: string
  /**
   * Optional priority / changeFrequency overrides per collection.
   */
  perCollection?: Record<string, { priority?: number; changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never' }>
  /**
   * Optional URL path prefix per collection. The Pages collection
   * lives at the root (`/about`) so it doesn't need a prefix, but
   * collections mounted under a sub-route (e.g. the lib's posts
   * collection under `/blog/[...slug]`) need their URLs prefixed
   * with `/blog` so the sitemap entries match the actual route.
   *
   * Defaults to `''` (no prefix). Pass a value like `'/blog'`
   * (leading slash, no trailing slash) for a sub-routed collection.
   */
  urlPrefixes?: Record<string, string>
}

type SitemapEntry = { url: string; lastModified?: string; changeFrequency?: string; priority?: number }

/**
 * Build a Next.js `GET` route handler for the host's
 * `app/(frontend)/<slug>-sitemap.xml/route.ts`. Lists every doc from
 * every configured collection at the host's site URL.
 *
 * Usage — multi-locale with `localePrefix: 'as-needed'`:
 *
 *   // app/(frontend)/pages-sitemap.xml/route.ts
 *   import { createSitemapHandler } from '@justanarthur/payload-www/render-utils'
 *   import configPromise from '@payload-config'
 *   import { getServerSideURL } from '@/utilities/getURL'
 *   export const GET = createSitemapHandler({
 *     collections: ['pages'],
 *     config: configPromise,
 *     getServerSideURL,
 *     localePrefix: 'as-needed'
 *   })
 *
 * The matching `app/(frontend)/[locale]/pages-sitemap.xml/route.ts`
 * route only needs the same options — the `[locale]` segment is read
 * from the Next.js route params and the handler restricts itself to
 * that single locale automatically:
 *
 *   // app/(frontend)/[locale]/pages-sitemap.xml/route.ts
 *   export const GET = createSitemapHandler({
 *     collections: ['pages'],
 *     config: configPromise,
 *     getServerSideURL,
 *     localePrefix: 'as-needed'
 *   })
 */
export function createSitemapHandler(options: CreateSitemapHandlerOptions) {
  const {
    collections,
    config,
    getServerSideURL,
    localePrefix = 'always',
    locales: localesOption,
    sitemapTag: _sitemapTag,
    perCollection = {},
    urlPrefixes = {}
  } = options
  const siteUrl = getServerSideURL().replace(/\/$/, '')

  return async function GET(_req: Request, ctx?: { params?: Promise<Record<string, string | string[]>> }): Promise<Response> {
    const cfg = await config
    const allLocales: string[] = Array.isArray(cfg.localization?.locales)
      ? cfg.localization.locales.map((l: any) => (typeof l === 'string' ? l : l.code))
      : [cfg.localization?.defaultLocale ?? 'en']
    const defaultLocale: string = cfg.localization?.defaultLocale ?? allLocales[0]

    // The `[locale]` route segment wins over the `locales` option
    // when present. This lets the host mount the same handler at
    // both `pages-sitemap.xml` (all locales) and `[locale]/pages-sitemap.xml`
    // (one locale) without per-route options.
    let activeLocales = allLocales
    if (ctx?.params) {
      const params = await ctx.params
      const paramLocale = Array.isArray(params.locale) ? params.locale[0] : params.locale
      if (paramLocale && allLocales.includes(paramLocale)) {
        activeLocales = [paramLocale]
      }
    } else if (Array.isArray(localesOption) && localesOption.length > 0) {
      activeLocales = localesOption.filter((l) => allLocales.includes(l))
    }

    const entries: SitemapEntry[] = []
    for (const collectionSlug of collections) {
      const collectionDefaults = perCollection[collectionSlug] ?? {}
      // Per-collection URL prefix (e.g. `/blog` for the posts
      // collection mounted under `/blog/[...slug]/page.tsx`).
      // Empty string = root (the Pages collection default).
      const urlPrefix = (urlPrefixes[collectionSlug] ?? '').replace(/\/$/, '')
      for (const locale of activeLocales) {
        const docs = await queryAllDocs({
          collectionSlug,
          slugField: 'slug',
          locale,
          config
        })
        for (const doc of docs) {
          const slugVal = (doc as any).slug
          if (typeof slugVal !== 'string' || slugVal === '') continue
          entries.push({
            url: `${siteUrl}${prefixFor(locale, defaultLocale, localePrefix)}${urlPrefix}/${slugVal}`,
            lastModified: doc.updatedAt ? new Date(doc.updatedAt as string).toISOString() : undefined,
            changeFrequency: collectionDefaults.changefreq ?? 'weekly',
            priority: collectionDefaults.priority ?? 0.5
          })
        }
      }
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (e) =>
      `  <url>\n    <loc>${e.url}</loc>${
        e.lastModified ? `\n    <lastmod>${e.lastModified}</lastmod>` : ''
      }${e.changeFrequency ? `\n    <changefreq>${e.changeFrequency}</changefreq>` : ''}${
        e.priority !== undefined ? `\n    <priority>${e.priority}</priority>` : ''
      }\n  </url>`
  )
  .join('\n')}
</urlset>`

    return new Response(xml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml; charset=utf-8' }
    })
  }
}

function prefixFor(locale: string, defaultLocale: string, mode: 'always' | 'as-needed' | 'never'): string {
  if (mode === 'never') return ''
  if (mode === 'as-needed' && locale === defaultLocale) return ''
  return `/${locale}`
}