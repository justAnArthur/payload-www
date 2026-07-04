import type { SEOMetaShape } from '../generateMeta'


export type SEOMetaImageProps = {
  title: string
  description?: string
  image?: string
  author?: string
  publishedAt?: string
  modifiedAt?: string
  locale?: string
  type?: 'website' | 'article'
}

const isNonEmpty = (v: unknown): v is string =>
  typeof v === 'string' && v.length > 0


const readImage = (v: unknown): string | undefined => {
  if (isNonEmpty(v)) return v
  if (typeof v === 'object' && v !== null) {
    const url = (v as { url?: unknown }).url
    if (isNonEmpty(url)) return url
  }
  return undefined
}

const pickString = (...candidates: unknown[]): string | undefined => {
  for (const c of candidates) if (isNonEmpty(c)) return c as string
  return undefined
}


export const extractSEOMetaForImage = (input: {
  meta?: SEOMetaShape | null
  fallback?: { title?: string; description?: string; image?: string }
  locale?: string
  type?: 'website' | 'article'
}): SEOMetaImageProps => {
  const meta = input.meta ?? null
  const content = meta?.content ?? {}
  const social = meta?.social?.social ?? {}
  const advanced = meta?.advanced?.advanced ?? {}

  const title = pickString(
    social.ogTitle,
    social.twitterTitle,
    content.title,
    input.fallback?.title,
    'Untitled'
  ) as string

  const description = pickString(
    social.ogDescription,
    social.twitterDescription,
    content.description,
    input.fallback?.description
  )

  const image =
    readImage(social.ogImage) ??
    readImage(social.twitterImage) ??
    readImage(content.image) ??
    readImage(input.fallback?.image)

  const author = pickString(advanced.author)

  const publishedAt = pickString(advanced.publishedAt)
  const modifiedAt = pickString(advanced.modifiedAt)

  const out: SEOMetaImageProps = { title }
  if (description) out.description = description
  if (image) out.image = image
  if (author) out.author = author
  
  
  
  
  if (input.type === 'article') {
    if (publishedAt) out.publishedAt = publishedAt
    if (modifiedAt) out.modifiedAt = modifiedAt
  }
  if (input.locale) out.locale = input.locale
  if (input.type) out.type = input.type

  return out
}