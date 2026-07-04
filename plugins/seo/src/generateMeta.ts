




type MetadataShape = {
  title?: string | { default: string; template: string } | { absolute: string; template?: string } | null
  description?: string | null
  keywords?: string | string[] | null
  authors?: Array<{ name?: string; url?: string }> | null
  robots?: string | { index: boolean; follow: boolean } | null
  alternates?: { canonical?: string; languages?: Record<string, string> } | null
  openGraph?: {
    type?: 'website' | 'article' | 'profile' | 'book' | 'music' | 'video'
    title?: string
    description?: string
    url?: string
    siteName?: string
    locale?: string
    images?: Array<{ url: string }>
    publishedTime?: string
    modifiedTime?: string
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
      ogUrl?: string | null
      ogSiteName?: string | null
      ogLocale?: string | null
      twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player' | null
      twitterTitle?: string | null
      twitterDescription?: string | null
      twitterImage?: string | { url?: string | null } | null
      twitterSite?: string | null
      twitterCreator?: string | null
    }
  }
  advanced?: {
    advanced?: {
      canonicalUrl?: string | null
      robots?: string | null
      noindex?: boolean | null
      author?: string | null
      publishedAt?: string | null
      modifiedAt?: string | null
    }
  }
} | null | undefined

export type GenerateMetaArgs = {
  
  meta: SEOMetaShape
  
  url?: string
  
  type?: 'website' | 'article'
  
  locale?: string
  
  fallback?: { title?: string; description?: string }
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
  fallback
}: GenerateMetaArgs): MetadataShape => {
  const content = meta?.content ?? {}
  const social = meta?.social?.social ?? {}
  const advanced = meta?.advanced?.advanced ?? {}

  const title = pickString(
    content.title,
    social.ogTitle,
    social.twitterTitle,
    fallback?.title,
    'Not found'
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
  const ogImage = readImage(social.ogImage) ?? readImage(content.image)
  const ogType = (social.ogType ?? type ?? 'website') as
    | 'website'
    | 'article'
    | 'profile'
    | 'book'
    | 'music'
    | 'video'

  const twitterTitle = pickString(social.twitterTitle, social.ogTitle, content.title)
  const twitterDescription = pickString(
    social.twitterDescription,
    social.ogDescription,
    content.description
  )
  const twitterImage =
    readImage(social.twitterImage) ??
    readImage(social.ogImage) ??
    readImage(content.image)
  const twitterCard: 'summary' | 'summary_large_image' | 'app' | 'player' =
    social.twitterCard ?? 'summary_large_image'

  const result: MetadataShape = { title }

  if (description) result.description = description

  if (isNonEmpty(content.keywords)) {
    result.keywords = splitKeywords(content.keywords)
  }

  if (isNonEmpty(advanced.author)) {
    result.authors = [{ name: advanced.author }]
  }

  if (advanced.noindex === true) {
    result.robots = { index: false, follow: false }
  } else if (isNonEmpty(advanced.robots)) {
    result.robots = advanced.robots
  }

  
  
  
  
  
  
  const openGraph: {
    type?: 'website' | 'article' | 'profile' | 'book' | 'music' | 'video'
    title?: string
    description?: string
    url?: string
    siteName?: string
    locale?: string
    images?: Array<{ url: string }>
    publishedTime?: string
    modifiedTime?: string
  } = {}
  if (ogTitle) openGraph.title = ogTitle
  if (ogDescription) openGraph.description = ogDescription
  if (ogType) openGraph.type = ogType
  if (isNonEmpty(social.ogUrl) || isNonEmpty(url)) {
    openGraph.url = (social.ogUrl ?? url) as string
  }
  if (isNonEmpty(social.ogSiteName)) openGraph.siteName = social.ogSiteName
  if (isNonEmpty(social.ogLocale) || isNonEmpty(locale)) {
    openGraph.locale = (social.ogLocale ?? locale) as string
  }
  if (ogImage) openGraph.images = [{ url: ogImage }]
  if (ogType === 'article') {
    if (isNonEmpty(advanced.publishedAt)) {
      openGraph.publishedTime = advanced.publishedAt
    }
    if (isNonEmpty(advanced.modifiedAt)) {
      openGraph.modifiedTime = advanced.modifiedAt
    }
  }
  if (Object.keys(openGraph).length > 0) {
    result.openGraph = openGraph
  }

  
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
  if (isNonEmpty(social.twitterSite)) twitter.site = social.twitterSite
  if (isNonEmpty(social.twitterCreator)) twitter.creator = social.twitterCreator
  if (twitterImage) twitter.images = [{ url: twitterImage }]
  if (Object.keys(twitter).length > 0) {
    result.twitter = twitter
  }

  return result
}
