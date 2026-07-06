import 'payload'
import { getPayload } from 'payload'
import type { SanitizedConfig } from 'payload'

import type { SiteDefaults } from '../types'


export type CreateSiteDefaultsArgs = {

  config: Promise<SanitizedConfig>

  locale: string

  slug?: string
}


export const createSiteDefaults = async (
  args: CreateSiteDefaultsArgs
): Promise<SiteDefaults | undefined> => {
  const { config, locale, slug = 'metadata' } = args
  try {
    const payload = await getPayload({ config })
    const raw = (await payload.findGlobal({
      slug,
      locale,
      depth: 0,
      draft: false
    })) as
      | {
          shared?: {
            name?: string | Record<string, string | undefined> | null
            description?: string | Record<string, string | undefined> | null
            logo?: string | null
          } | null
          organization?: {
            sameAs?: { value?: string | null }[] | string[] | null
          } | null
          product?: {
            offers?: {
              price?: string | null
              priceCurrency?: string | null
              availability?: string | null
            } | null
          } | null
          twitterSite?: string | null
          twitterCreator?: string | null
          defaultOgImage?: string | null
          keywords?: string | Record<string, string | undefined> | null
        }
      | null

    if (!raw) return undefined

    const resolveLocalizedString = (
      value: string | Record<string, string | undefined> | null | undefined
    ): string | undefined => {
      if (typeof value === 'string') return value
      if (value && typeof value === 'object') {
        const localized = (value as Record<string, string | undefined>)[locale]
        if (typeof localized === 'string' && localized.length > 0) return localized
      }
      return undefined
    }

    const out: SiteDefaults = {}

    // shared: name, description, logo
    if (raw.shared && typeof raw.shared === 'object') {
      const name = resolveLocalizedString(raw.shared.name)
      const description = resolveLocalizedString(raw.shared.description)
      const logo =
        typeof raw.shared.logo === 'string' && raw.shared.logo.length > 0
          ? raw.shared.logo
          : undefined
      if (name || description || logo) {
        out.shared = {}
        if (name) out.shared.name = name
        if (description) out.shared.description = description
        if (logo) out.shared.logo = logo
      }
    }

    // organization: sameAs
    if (raw.organization && typeof raw.organization === 'object') {
      const sameAsRaw = raw.organization.sameAs
      if (Array.isArray(sameAsRaw)) {
        const urls = sameAsRaw
          .map((entry) => {
            if (typeof entry === 'string') return entry
            if (entry && typeof entry === 'object' && typeof entry.value === 'string') {
              return entry.value
            }
            return null
          })
          .filter((v): v is string => typeof v === 'string' && v.length > 0)
        if (urls.length > 0) {
          out.organization = { sameAs: urls }
        }
      }
    }

    // product: offers
    if (raw.product && typeof raw.product === 'object' && raw.product.offers && typeof raw.product.offers === 'object') {
      const offer: { price?: string; priceCurrency?: string; availability?: string } = {}
      const o = raw.product.offers
      if (typeof o.price === 'string' && o.price.length > 0) offer.price = o.price
      if (typeof o.priceCurrency === 'string' && o.priceCurrency.length > 0) offer.priceCurrency = o.priceCurrency
      if (typeof o.availability === 'string' && o.availability.length > 0) offer.availability = o.availability
      if (Object.keys(offer).length > 0) {
        out.product = { offers: offer }
      }
    }

    if (typeof raw.twitterSite === 'string' && raw.twitterSite.length > 0) {
      out.twitterSite = raw.twitterSite
    }
    if (typeof raw.twitterCreator === 'string' && raw.twitterCreator.length > 0) {
      out.twitterCreator = raw.twitterCreator
    }
    if (typeof raw.defaultOgImage === 'string' && raw.defaultOgImage.length > 0) {
      out.defaultOgImage = raw.defaultOgImage
    }

    // keywords: localized (operator can ship a per-locale keyword set)
    const keywords = resolveLocalizedString(raw.keywords)
    if (keywords) {
      out.keywords = keywords
    }

    return Object.keys(out).length > 0 ? out : undefined
  } catch {
    return undefined
  }
}