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
   * Per-collection revalidation tag. The lib's Pages revalidation
   * hook revalidates this tag, so a page save refreshes the sitemap.
   * Default: `'pages-sitemap'`.
   */
  sitemapTag?: string
  /**
   * Optional priority / changeFrequency overrides per collection.
   */
  perCollection?: Record<string, { priority?: number; changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never' }>
}

type SitemapEntry = { url: string; lastModified?: string; changeFrequency?: string; priority?: number }

/**
 * Build a Next.js `GET` route handler for the host's
 * `app/(frontend)/<slug>-sitemap.xml/route.ts`. Lists every doc from
 * every configured collection at the host's site URL.
 *
 * Usage:
 *
 *   // app/(frontend)/pages-sitemap.xml/route.ts
 *   import { createSitemapHandler } from '@justanarthur/payload-www/render-utils'
 *   import configPromise from '@payload-config'
 *   import { getServerSideURL } from '@/utilities/getURL'
 *   export const GET = createSitemapHandler({
 *     collections: ['pages'],
 *     config: configPromise,
 *     getServerSideURL
 *   })
 */
export function createSitemapHandler(options: CreateSitemapHandlerOptions) {
  const { collections, config, getServerSideURL, sitemapTag: _sitemapTag, perCollection = {} } = options
  const siteUrl = getServerSideURL().replace(/\/$/, '')

  return async function GET(): Promise<Response> {
    const cfg = await config
    const allLocales: string[] = Array.isArray(cfg.localization?.locales)
      ? cfg.localization.locales.map((l: any) => (typeof l === 'string' ? l : l.code))
      : [cfg.localization?.defaultLocale ?? 'en']

    const entries: SitemapEntry[] = []
    for (const collectionSlug of collections) {
      const collectionDefaults = perCollection[collectionSlug] ?? {}
      for (const locale of allLocales) {
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
            url: `${siteUrl}/${locale}/${slugVal}`,
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
