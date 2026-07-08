import { createSitemapFromCollections } from '@justanarthur/payload-www/sitemap'

import { generateSitemap as pagesGenerateSitemapRaw } from '../../(pages)/[locale]/(pages)/[[...slug]]/page'
import { generateSitemap as postsGenerateSitemapRaw } from '../../(pages)/[locale]/posts/[slug]/page'
import { generateSitemap as categoriesGenerateSitemapRaw } from '../../(pages)/[locale]/posts/category/[slug]/page'

// ponytail: lib attaches `.pagePathPrefix` at runtime but the TS surface is `() => Promise<Sitemap>`.
// Cast through `unknown` to access the runtime-only property.
const pagesGenerateSitemap = pagesGenerateSitemapRaw as unknown as (() => Promise<unknown>) & { pagePathPrefix?: string }
pagesGenerateSitemap.pagePathPrefix = 'pages'

export const GET = createSitemapFromCollections(
  pagesGenerateSitemap as never,
  postsGenerateSitemapRaw as never,
  categoriesGenerateSitemapRaw as never
)