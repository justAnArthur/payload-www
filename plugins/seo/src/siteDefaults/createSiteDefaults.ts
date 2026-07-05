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
          siteName?: string | Record<string, string | undefined> | null
          twitterSite?: string | null
          twitterCreator?: string | null
        }
      | null

    if (!raw) return undefined

    const siteName =
      typeof raw.siteName === 'string'
        ? raw.siteName
        : raw.siteName && typeof raw.siteName === 'object'
          ? (raw.siteName[locale] ?? undefined)
          : undefined

    const out: SiteDefaults = {}
    if (siteName) out.siteName = siteName
    if (typeof raw.twitterSite === 'string' && raw.twitterSite.length > 0) {
      out.twitterSite = raw.twitterSite
    }
    if (typeof raw.twitterCreator === 'string' && raw.twitterCreator.length > 0) {
      out.twitterCreator = raw.twitterCreator
    }
    return Object.keys(out).length > 0 ? out : undefined
  } catch {
    return undefined
  }
}
