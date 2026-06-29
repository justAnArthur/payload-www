import { createSitemapFile } from '@justanarthur/payload-www/render-utils'

import configPromise from '@payload-config'
import { getServerSideURL } from '@/utilities/getURL'

/**
 * Single unified sitemap at `/sitemap.xml` (Next.js's `sitemap.ts`
 * file convention with a default export). The lib's `createSitemapFile`
 * factory returns the typed `MetadataRoute.Sitemap` array — Next.js
 * handles XML serialization, including the `alternates.languages`
 * hreflang blocks per URL.
 *
 * One file, all collections (pages + posts), all locales — replaces
 * the four legacy `*-sitemap.xml/route.ts` handlers and fixes the
 * broken top-level `blog-sitemap.xml` that advertised non-existent
 * `/blog/<slug>` URLs (the actual post route is `/posts/<slug>`,
 * so `urlPrefixes.posts` matches it directly).
 */
export default createSitemapFile({
  collections: ['pages', 'posts'],
  config: configPromise,
  getServerSideURL,
  localePrefix: 'as-needed',
  urlPrefixes: { posts: '/posts' }
})
