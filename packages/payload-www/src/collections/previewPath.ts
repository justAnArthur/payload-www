import type { CollectionSlug, PayloadRequest } from 'payload'

const collectionPrefixMap: Partial<Record<CollectionSlug, string>> = {
  posts: '/posts',
  pages: '',
}

export function generatePreviewPath({
  collection,
  slug,
}: {
  collection: CollectionSlug
  slug: string | null | undefined
  req?: PayloadRequest
}): string | null {
  if (slug === undefined || slug === null) return null
  const encodedSlug = encodeURIComponent(slug)
  const params = new URLSearchParams({
    path: `${collectionPrefixMap[collection] ?? ''}/${encodedSlug}`,
    previewSecret: process.env.PREVIEW_SECRET || '',
  })
  return `/next/preview?${params.toString()}`
}
