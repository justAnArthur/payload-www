import 'server-only'

import type { Locale, SanitizedConfig } from 'payload'
import { getPayload } from 'payload'

import { buildRootJsonLd } from './jsonld'


export type RootJsonLdProps = {
  config: Promise<SanitizedConfig>
  locale: Locale
  getServerSideURL: () => string
  locales: readonly string[]
}


// Async server component that renders the site-wide JSON-LD payload as a single
// `<script type="application/ld+json">` tag. Reads the seo plugin's `metadata`
// global directly via Payload (no caching wrapper — the root layout runs once
// per request, and the query is cheap).
export async function RootJsonLd({
                                    config,
                                    locale,
                                    getServerSideURL,
                                    locales
                                  }: RootJsonLdProps) {
  const payload = await getPayload({ config })

  const metadata = (await payload.findGlobal({
    slug: 'metadata',
    locale,
    depth: 0,
    draft: false
  })) as {
    shared?: { name?: string | null; description?: string | null; logo?: string | null } | null
    organization?: { sameAs?: { value?: string | null }[] | null } | null
    product?: {
      offers?: { price?: string | null; priceCurrency?: string | null; availability?: string | null } | null
    } | null
  } | null

  const siteUrl = getServerSideURL()

  const sameAs = Array.isArray(metadata?.organization?.sameAs)
    ? metadata!.organization!.sameAs!
        .map((entry) => entry?.value)
        .filter((v): v is string => typeof v === 'string' && v.length > 0)
    : undefined

  const offers = metadata?.product?.offers
  const hasOffers = offers && (offers.price || offers.priceCurrency || offers.availability)

  const records = buildRootJsonLd({
    siteUrl,
    inLanguage: [...locales],
    shared: metadata?.shared
      ? {
          name: metadata.shared.name ?? undefined,
          description: metadata.shared.description ?? undefined,
          logo: metadata.shared.logo ?? undefined
        }
      : undefined,
    organization: sameAs ? { sameAs } : undefined,
    product: hasOffers
      ? {
          offers: {
            price: offers!.price ?? undefined,
            priceCurrency: offers!.priceCurrency ?? undefined,
            availability: offers!.availability ?? undefined
          }
        }
      : undefined
  })

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(records) }}
    />
  )
}