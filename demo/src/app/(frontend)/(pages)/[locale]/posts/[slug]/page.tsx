import { createCollectionPageExports } from '@justanarthur/payload-www/render-pages'

import { asyncImportMap as importMap } from '@/app/(payload)/admin/asyncImportMap'
import { routing } from '@/i18n/routing'
import { getServerSideURL } from '@/utilities/getURL'
import config from '@payload-config'

const { default: Page, generateMetadata, generateStaticParams, generateSitemap } = createCollectionPageExports(
  { _payloadConfig: config, importMap, routing: routing as unknown as Parameters<typeof createCollectionPageExports>[0]['routing'], slug: 'posts' },
  { getServerSideURL, pagePathPrefix: 'posts' }
)

export default Page
export { generateMetadata, generateStaticParams, generateSitemap }

// the doc lookup blocks so unknown slugs can return a real 404
export const instant = false