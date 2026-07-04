import type { Metadata } from 'next'

import { createCollectionPageExports } from '@justanarthur/payload-www/render-pages'
import configPromise from '@payload-config'

import { importMap } from '@/app/(payload)/admin/importMap.js'
import { getServerSideURL } from '@/utilities/getURL'
import { routing } from '@/i18n/routing'

import type { Post } from '@/payload-types'


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
  { getServerSideURL, generateMeta }
)

export { generateMetadata, generateStaticParams }
export default Page
