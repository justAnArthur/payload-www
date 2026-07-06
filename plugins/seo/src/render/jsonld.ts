// Site-wide JSON-LD builders. Drives Organization / WebSite / Product schemas on
// every page from the seo plugin's `metadata` global. Per-page JSON-LD
// (Article/BreadcrumbList for content collections) lives in payload-www.

export type BuildOrganizationLdOptions = {
  siteUrl: string
  shared?: { name?: string; description?: string; logo?: string }
  organization?: { sameAs?: string[] }
}


export function buildOrganizationLd({
                                       siteUrl,
                                       shared,
                                       organization
                                     }: BuildOrganizationLdOptions): Record<string, unknown> {
  const org: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${siteUrl}#organization`,
    url: siteUrl,
    ...(shared?.name && { name: shared.name }),
    ...(shared?.description && { description: shared.description }),
    ...(shared?.logo && { logo: { '@type': 'ImageObject', url: shared.logo } }),
    ...(organization?.sameAs && organization.sameAs.length > 0 && { sameAs: organization.sameAs })
  }
  return org
}


export type BuildWebSiteLdOptions = {
  siteUrl: string
  shared?: { name?: string; description?: string }
  description?: string
  inLanguage: string[]
  organizationId: string
}


export function buildWebSiteLd({
                                 siteUrl,
                                 shared,
                                 description,
                                 inLanguage,
                                 organizationId
                               }: BuildWebSiteLdOptions): Record<string, unknown> {
  // `description` is an explicit override; falls back to shared.description.
  const desc = description ?? shared?.description
  const site: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteUrl}#website`,
    url: siteUrl,
    ...(shared?.name && { name: shared.name }),
    ...(desc && { description: desc }),
    inLanguage,
    publisher: { '@id': organizationId },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}/search?q={search_term_string}`
      },
      // schema.org SearchAction requires this property name verbatim
      'query-input': 'required name=search_term_string'
    }
  }
  return site
}


export type BuildProductLdOptions = {
  siteUrl: string
  shared?: { name?: string; description?: string; logo?: string }
  product?: {
    offers?: { price?: string; priceCurrency?: string; availability?: string }
  }
  organizationId: string
}


// Product.offers is intentionally omitted when product.offers is not provided:
// Camasys pricing is per-vehicle / contact-sales (see `pricing-cards` block:
// `minPricePerCar` / `maxPricePerCar` ranges). schema.org Offer is for fixed-price
// SKUs; emitting one would be wrong here. Revisit if pricing changes.
export function buildProductLd({
                                 siteUrl,
                                 shared,
                                 product,
                                 organizationId
                               }: BuildProductLdOptions): Record<string, unknown> {
  const productLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${siteUrl}#product`,
    url: siteUrl,
    ...(shared?.name && { name: shared.name }),
    ...(shared?.description && { description: shared.description }),
    ...(shared?.name && { brand: { '@type': 'Brand', name: shared.name } }),
    ...(shared?.logo && { image: { '@type': 'ImageObject', url: shared.logo } }),
    manufacturer: { '@id': organizationId }
  }
  const offers = product?.offers
  if (offers && (offers.price !== undefined || offers.priceCurrency !== undefined || offers.availability !== undefined)) {
    const offerLd: Record<string, unknown> = { '@type': 'Offer', url: siteUrl }
    if (offers.price !== undefined) offerLd.price = offers.price
    if (offers.priceCurrency !== undefined) offerLd.priceCurrency = offers.priceCurrency
    if (offers.availability !== undefined) offerLd.availability = offers.availability
    productLd.offers = offerLd
  }
  return productLd
}


export type BuildRootJsonLdOptions = {
  siteUrl: string
  inLanguage: string[]
  shared?: { name?: string; description?: string; logo?: string }
  organization?: { sameAs?: string[] }
  product?: {
    offers?: { price?: string; priceCurrency?: string; availability?: string }
  }
}


export function buildRootJsonLd(options: BuildRootJsonLdOptions): Record<string, unknown>[] {
  const organization = buildOrganizationLd({
    siteUrl: options.siteUrl,
    shared: options.shared,
    organization: options.organization
  })
  const organizationId = organization['@id'] as string
  const website = buildWebSiteLd({
    siteUrl: options.siteUrl,
    shared: options.shared,
    inLanguage: options.inLanguage,
    organizationId
  })
  const product = buildProductLd({
    siteUrl: options.siteUrl,
    shared: options.shared,
    product: options.product,
    organizationId
  })
  return [organization, website, product]
}