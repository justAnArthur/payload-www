// Per-page JSON-LD builders (Article, BreadcrumbList). Site-wide builders
// (Organization / WebSite / Product) live in the seo plugin at
// `@justanarthur/payload-plugin-seo/root-jsonld`; payload-www re-exports them
// from `./metadata` for host convenience.

import { getImageUrl, resolveLocalizedField } from './jsonld-utils'

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
    headline: resolveLocalizedField(doc.title, locale),
    description: resolveLocalizedField(
      doc.meta?.description ?? doc.description ?? doc.excerpt,
      locale
    ),
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