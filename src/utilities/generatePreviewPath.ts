import { CollectionSlug, PayloadRequest } from 'payload'

const collectionPrefixMap: Partial<Record<CollectionSlug, string>> = {
  posts: '/posts',
  pages: '',
}

type Props = {
  collection: keyof typeof collectionPrefixMap
  slug: string
  req: PayloadRequest
}

export const generatePreviewPath = ({ collection, slug, req: { locale } }: Props) => {
  const encodedParams = new URLSearchParams({
    slug,
    collection,
    path: `/${locale}/${collectionPrefixMap[collection]}/${slug}`,
    previewSecret: process.env.PREVIEW_SECRET || '',
  })

  return `/next/preview?${encodedParams.toString()}`
}
