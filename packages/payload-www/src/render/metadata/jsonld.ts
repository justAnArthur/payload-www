function getImageUrl(doc: Record<string, any>, siteUrl: string): string | null {
  const img = doc?.meta?.image ?? doc?.heroImage ?? doc?.image
  if (!img) return null
  if (typeof img === 'string') return img
  if (img?.url) return img.url.startsWith('http') ? img.url : `${siteUrl}${img.url}`
  return null
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

  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': type,
    '@id': `${url}#article`,
    headline: doc.title ?? '',
    description: doc.meta?.description ?? doc.description ?? '',
    inLanguage: locale,
    url,
    dateModified: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : undefined
  }

  const datePublished = (doc as any).publishedAt ?? doc.createdAt
  if (datePublished) ld.datePublished = new Date(datePublished).toISOString()

  const imgUrl = getImageUrl(doc, siteUrl)
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
