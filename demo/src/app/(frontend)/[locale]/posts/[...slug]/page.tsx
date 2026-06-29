import type { Metadata } from 'next'

import { createCollectionPageExports } from '@justanarthur/payload-www/render-pages'
import configPromise from '@payload-config'

import { importMap } from '@/app/(payload)/admin/importMap.js'
import { getServerSideURL } from '@/utilities/getURL'
import { routing } from '@/i18n/routing'

import type { Post } from '@/payload-types'

/**
 * Individual post route. Mounts the lib's generic page factory
 * with `slug: 'posts'` (so it queries the Posts collection instead
 * of Pages) and the showcase enabled (so visitors see the post's
 * metadata, the BlogPosting JSON-LD, and a language switcher in
 * the sidebar alongside the rendered body — exactly what the home
 * page already shows).
 *
 * The lib's `createCollectionPageExports` defaults the render
 * path to `<PostsPage>` and the JSON-LD to a `{type:'article'}`
 * entry for the posts collection, so this file stays thin.
 *
 * The `doc` argument is the host's generated `Post` type —
 * localized fields are already resolved for the active locale.
 */
const generateMeta = async ({
  doc,
  type
}: {
  doc: Post | null
  type: 'website' | 'article'
}): Promise<Metadata> => {
  if (!doc) return { title: 'Not found' }
  const title = doc.title
  const description = doc.excerpt ?? undefined
  if (type === 'article') {
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'article',
        publishedTime: doc.publishedAt ?? undefined
      }
    }
  }
  return { title, description, openGraph: { title, description } }
}

const { default: Page, generateMetadata, generateStaticParams } = createCollectionPageExports(
  {
    config: configPromise,
    slug: 'posts',
    routing,
    importMap
  },
  { getServerSideURL, generateMeta, showcase: { enabled: true } }
)

export { generateMetadata, generateStaticParams }
export default Page
