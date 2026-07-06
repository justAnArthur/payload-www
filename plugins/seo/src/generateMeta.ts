import type { SiteDefaults } from './types'

type MetadataShape = {
  title?: string | { default: string; template: string } | { absolute: string; template?: string }
  description?: string | null
  keywords?: string | string[] | null
  openGraph?: {
    type?: 'website' | 'article' | 'profile' | 'book' | 'music' | 'video'
    title?: string
    description?: string
    url?: string
    siteName?: string
    locale?: string
    images?: Array<{ url: string }>
  } | null
  twitter?: {
    card: 'summary' | 'summary_large_image' | 'app' | 'player'
    title?: string
    description?: string
    site?: string
    creator?: string
    images?: Array<{ url: string }>
  } | null
}


export type SEOMetaShape = {
  content?: {
    title?: string | null
    description?: string | null
    keywords?: string | null
    image?: string | { url?: string | null } | null
  }
  social?: {
    social?: {
      ogTitle?: string | null
      ogDescription?: string | null
      ogImage?: string | { url?: string | null } | null
      ogType?: 'website' | 'article' | 'profile' | 'book' | 'music' | 'video' | null
      twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player' | null
      twitterTitle?: string | null
      twitterDescription?: string | null
      twitterImage?: string | { url?: string | null } | null
    }
  }
} | null | undefined

export type GenerateMetaArgs = {

  meta: SEOMetaShape

  url?: string

  type?: 'website' | 'article'

  locale?: string

  fallback?: { title?: string; description?: string }

  siteDefaults?: SiteDefaults
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


const splitKeywords = (raw: string): string[] =>
  raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)


export const generateMeta = ({
                               meta,
                               url,
                               type,
                               locale,
                               fallback,
                               siteDefaults
                             }: GenerateMetaArgs): MetadataShape => {
  const content = meta?.content ?? {}
  const social = meta?.social?.social ?? {}

  const title = pickString(
    content.title,
    social.ogTitle,
    social.twitterTitle,
    fallback?.title,
    fallback?.['name']
  )
  const description = pickString(
    content.description,
    social.ogDescription,
    social.twitterDescription,
    fallback?.description
  )

  if (!meta) return description ? { title, description } : { title }

  const ogTitle = pickString(social.ogTitle, content.title)
  const ogDescription = pickString(social.ogDescription, content.description)
  const ogImage =
    readImage(social.ogImage) ?? readImage(content.image) ?? siteDefaults?.defaultOgImage
  const ogType = (social.ogType ?? type ?? 'website') as
    | 'website'
    | 'article'
    | 'profile'
    | 'book'
    | 'music'
    | 'video'

  const ogSiteName = pickString(siteDefaults?.siteName)

  const twitterTitle = pickString(social.twitterTitle, social.ogTitle, content.title)
  const twitterDescription = pickString(
    social.twitterDescription,
    social.ogDescription,
    content.description
  )
  const twitterImage =
    readImage(social.twitterImage) ??
    readImage(social.ogImage) ??
    readImage(content.image) ??
    siteDefaults?.defaultOgImage
  const twitterCard: 'summary' | 'summary_large_image' | 'app' | 'player' =
    social.twitterCard ?? 'summary_large_image'

  const result: MetadataShape = { title }

  if (description) result.description = description

  if (isNonEmpty(content.keywords)) {
    result.keywords = splitKeywords(content.keywords)
  }

  const openGraph: {
    type?: 'website' | 'article' | 'profile' | 'book' | 'music' | 'video'
    title?: string
    description?: string
    url?: string
    siteName?: string
    locale?: string
    images?: Array<{ url: string }>
  } = {}
  if (ogTitle) openGraph.title = ogTitle
  if (ogDescription) openGraph.description = ogDescription
  if (ogType) openGraph.type = ogType
  if (isNonEmpty(url)) openGraph.url = url
  if (ogSiteName) openGraph.siteName = ogSiteName
  if (isNonEmpty(locale)) openGraph.locale = locale
  if (ogImage) openGraph.images = [{ url: ogImage }]
  if (Object.keys(openGraph).length > 0) {
    result.openGraph = openGraph
  }

  const twitterSite = pickString(siteDefaults?.twitterSite)
  const twitterCreator = pickString(siteDefaults?.twitterCreator)

  const twitter: {
    card: 'summary' | 'summary_large_image' | 'app' | 'player'
    title?: string
    description?: string
    site?: string
    creator?: string
    images?: Array<{ url: string }>
  } = { card: twitterCard }
  if (twitterTitle) twitter.title = twitterTitle
  if (twitterDescription) twitter.description = twitterDescription
  if (twitterSite) twitter.site = twitterSite
  if (twitterCreator) twitter.creator = twitterCreator
  if (twitterImage) twitter.images = [{ url: twitterImage }]
  if (Object.keys(twitter).length > 0) {
    result.twitter = twitter
  }

  return result
}
