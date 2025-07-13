import type { Config } from '@/payload-types'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { unstable_cache } from 'next/cache'
import { Locale } from '@/lib/i18n/locales'

type Global = keyof Config['globals']

async function getGlobal<Slug extends Global>(slug: Slug, locale: Locale, depth = 0) {
  const payload = await getPayload({ config: configPromise })

  return (await payload.findGlobal({ slug, locale, depth })) as Config['globals'][Slug]
}

/**
 * Returns an unstable_cache function mapped with the cache tag for the slug
 */
export const getCachedGlobal = <Slug extends Global>(slug: Slug, locale: Locale, depth = 0) =>
  unstable_cache(async () => getGlobal(slug, locale, depth), [slug, locale], {
    tags: [`global_${slug}_${locale}`],
  })
