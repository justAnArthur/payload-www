function getImageUrl(doc: Record<string, any>, siteUrl: string): string | null {
  const img = doc?.meta?.image ?? doc?.heroImage ?? doc?.image
  if (!img) return null
  if (typeof img === 'string') return img
  if (img?.url) return img.url.startsWith('http') ? img.url : `${siteUrl}${img.url}`
  return null
}

function getImageUrlWithLog(doc: Record<string, any>, siteUrl: string): string | null {
  const result = getImageUrl(doc, siteUrl)
  console.log('[WWW] render/metadata:jsonld:getImageUrl ->', result)
  return result
}


function resolveLocalizedField(value: unknown, locale: string): string {
  if (value == null) return ''
  if (typeof value === 'string') {
    if (!value.startsWith('{')) return value
    try {
      const parsed = JSON.parse(value)
      return resolveLocalizedField(parsed, locale)
    } catch {
      return value
    }
  }
  if (typeof value !== 'object') return ''
  const obj = value as Record<string, unknown>
  if (typeof obj[locale] === 'string' && (obj[locale] as string).length > 0) {
    return obj[locale] as string
  }
  return Object.values(obj)
    .filter((v): v is string => typeof v === 'string' && v.length > 0)
    .join(' / ')
}

function resolveLocalizedFieldWithLog(value: unknown, locale: string): string {
  const result = resolveLocalizedField(value, locale)
  if (value && typeof value === 'object') {
    console.log('[WWW] render/metadata:jsonld:resolveLocalizedField locale=', locale, '->', JSON.stringify(result))
  }
  return result
}

export type ArticleLdOptions = {
  doc: Record<string, any>
  url: string
  locale: string
  siteUrl: string
  type?: 'BlogPosting' | 'Article' | 'NewsArticle' | 'TechArticle'
  publisherName?: string
  publisherLogo?: string | null
}

export function buildArticleLd({
                                 doc,
                                 url,
                                 locale,
                                 siteUrl,
                                 type = 'BlogPosting',
                                 publisherName,
                                 publisherLogo
                               }: ArticleLdOptions): Record<string, unknown> {
  const name = publisherName ?? new URL(siteUrl).hostname

  console.log('[WWW] render/metadata:buildArticleLd url=', url, 'locale=', locale, 'type=', type, 'publisherName=', name)

  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': type,
    '@id': `${url}#article`,
    headline: resolveLocalizedFieldWithLog(doc.title, locale),
    description: resolveLocalizedFieldWithLog(
      doc.meta?.description ?? doc.description ?? doc.excerpt,
      locale
    ),
    inLanguage: locale,
    url,
    dateModified: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : undefined
  }

  const datePublished = (doc as any).publishedAt ?? doc.createdAt
  if (datePublished) ld.datePublished = new Date(datePublished).toISOString()

  const imgUrl = getImageUrlWithLog(doc, siteUrl)
  if (imgUrl) ld.image = imgUrl

  ld.author = { '@type': 'Organization', name, url: siteUrl }

  const publisher: Record<string, unknown> = { '@type': 'Organization', name }
  if (publisherLogo !== undefined) {
    if (publisherLogo !== null) publisher.logo = { '@type': 'ImageObject', url: publisherLogo }
  }
  ld.publisher = publisher

  return ld
}

export type BreadcrumbItem = { label: string; url: string }

export function buildBreadcrumbsLd({
                                     items,
                                     currentUrl
                                   }: {
  items: BreadcrumbItem[]
  currentUrl: string
}): Record<string, unknown> {
  console.log('[WWW] render/metadata:buildBreadcrumbsLd items=', items.length, 'currentUrl=', currentUrl)
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: index === items.length - 1 ? currentUrl : item.url
    }))
  }
}

export function buildOrganizationLd({
                                      siteUrl,
                                      name,
                                      logo,
                                      sameAs
                                    }: {
  siteUrl: string
  name?: string
  logo?: string
  sameAs?: string[]
}): Record<string, unknown> {
  console.log('[WWW] render/metadata:buildOrganizationLd siteUrl=', siteUrl, 'name=', name, 'logo?', Boolean(logo), 'sameAs?', Boolean(sameAs))
  const org: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${siteUrl}#organization`,
    url: siteUrl,
    ...(name && { name }),
    ...(logo && { logo: { '@type': 'ImageObject', url: logo } }),
    ...(sameAs && sameAs.length > 0 && { sameAs })
  }
  return org
}
