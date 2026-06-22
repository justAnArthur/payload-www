import type { SEOMetaShape } from '../generateMeta'

/**
 * Props handed to a user-provided OG image React component.
 *
 * `title` is the only required field — `extractSEOMetaForImage` guarantees
 * a non-empty string (cascade: ogTitle → content.title → fallback.title →
 * `'Untitled'`). Everything else is best-effort: if the meta group has
 * nothing to pull from, the field is `undefined` and the host component
 * is free to render its own fallback.
 */
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

/** Normalize `string | { url } | null` upload shape to a URL string or undefined. */
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

/**
 * Pull OG-image-ready props out of a Payload SEO `meta` group.
 *
 * Pure — no React, no side effects, no Payload runtime required. The host's
 * OG image component receives these as JSX props. Mirrors the cascade in
 * `generateMeta` so the OG image and the `<meta property="og:*">` tags
 * stay in sync:
 *
 * - title: ogTitle → twitterTitle → content.title → fallback.title → `'Untitled'`
 * - description: ogDescription → twitterDescription → content.description → fallback.description
 * - image: ogImage → twitterImage → content.image (resolves `{ url }` upload shape)
 * - author: advanced.advanced.author
 * - publishedAt / modifiedAt: advanced.advanced.{publishedAt,modifiedAt} (only when `type === 'article'`)
 *
 *   import { extractSEOMetaForImage } from '@justanarthur/payload-plugin-seo/opengraph-image'
 *
 *   const props = extractSEOMetaForImage({
 *     meta: doc?.meta,
 *     fallback: { title: doc?.title }
 *   })
 *   return new ImageResponse(<PostOG {...props} />, { width: 1200, height: 630 })
 */
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
  // Article-only fields: per Next.js convention, publishedTime /
  // modifiedTime only render for `ogType: 'article'`. Match the same gate
  // here so an OG image for a generic page doesn't surface a "2024-01-01"
  // it has no business showing.
  if (input.type === 'article') {
    if (publishedAt) out.publishedAt = publishedAt
    if (modifiedAt) out.modifiedAt = modifiedAt
  }
  if (input.locale) out.locale = input.locale
  if (input.type) out.type = input.type

  return out
}