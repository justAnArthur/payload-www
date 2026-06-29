import type { Metadata } from 'next'

import { createCollectionPageExports } from '@justanarthur/payload-www/render-pages'
import configPromise from '@payload-config'

import { importMap } from '@/app/(payload)/admin/importMap.js'
import { getServerSideURL } from '@/utilities/getURL'
import { routing } from '@/i18n/routing'

import type { Page } from '@/payload-types'

/**
 * Catch-all page rendered by the lib. Matches any non-home doc
 * under `/${locale}/...`. Hosts that want a different render for
 * specific doc types define a custom `renderPath` on the collection
 * and pass it here.
 *
 * Showcase enabled so `/about`, `/docs`, etc. render the same
 * sidebar (metadata + JSON-LD + language switcher) as the home
 * and individual posts.
 *
 * The `doc` argument is the host's generated `Page` type —
 * localized fields are already resolved for the active locale.
 */
const generateMeta = async ({ doc }: { doc: Page | null }): Promise<Metadata> => {
  if (!doc) return { title: 'Not found' }
  const title = doc.title ?? 'Untitled'
  const description = doc.meta?.content?.description ?? undefined
  return {
    title,
    description,
    openGraph: {
      title,
      description
    }
  }
}

const { default: Page, generateMetadata, generateStaticParams } = createCollectionPageExports(
  { config: configPromise, routing, importMap },
  { getServerSideURL, generateMeta, showcase: { enabled: true } }
)

export { generateMetadata, generateStaticParams }
export default Page
