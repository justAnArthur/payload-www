import { createCollectionPageExports } from '@justanarthur/payload-www/render-pages'

import { asyncImportMap as importMap } from '@/app/(payload)/admin/asyncImportMap'
import { routing } from '@/i18n/routing'
import { getServerSideURL } from '@/utilities/getURL'
import config from '@payload-config'

// ponytail: Next 16 AppPageConfig sync-params mismatch — see [[...slug]]/page.tsx for the full note.
const built = createCollectionPageExports(
  { config, importMap, routing: routing as unknown as Parameters<typeof createCollectionPageExports>[0]['routing'], slug: 'posts' },
  { getServerSideURL, pagePathPrefix: 'posts' }
) as unknown as {
  default: React.ComponentType<{ params: Promise<{ locale: string; slug: string }> }>
  generateMetadata: (props: { params: Promise<{ locale: string; slug: string }> }) => Promise<unknown>
  generateStaticParams: (props: { params: { locale: string; slug: string } }) => Promise<{ slug: string }[]>
  generateSitemap: () => Promise<import('next').MetadataRoute.Sitemap>
}

const Page = built.default
const generateMetadata = built.generateMetadata
const generateStaticParams = built.generateStaticParams
const generateSitemap = built.generateSitemap

export default Page
export { generateMetadata, generateStaticParams, generateSitemap }