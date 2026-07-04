import type { Metadata } from 'next'

import { createCollectionPageExports } from '@justanarthur/payload-www/render-pages'
import configPromise from '@payload-config'

import { importMap } from '@/app/(payload)/admin/importMap.js'
import { getServerSideURL } from '@/utilities/getURL'
import { routing } from '@/i18n/routing'

import type { Page } from '@/payload-types'


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
  { getServerSideURL, generateMeta }
)

export { generateMetadata, generateStaticParams }
export default Page
