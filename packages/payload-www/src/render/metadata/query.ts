import type {
  CollectionSlug,
  DataFromCollectionSlug,
  DataFromGlobalSlug,
  SanitizedConfig
} from 'payload'
import type { CacheHelpers } from '@pro-laico/payload-revalidate/cache'
import { createCacheHelpers } from '@pro-laico/payload-revalidate/cache'
import { tagsFor } from '@pro-laico/payload-revalidate'
import { cacheLife } from 'next/cache'
import { getPayload } from 'payload'

let _helpers: CacheHelpers | null = null
let _seedPromise: Promise<void> | null = null

export type SeedPayloadCacheArgs = {
  config: SanitizedConfig | Promise<SanitizedConfig>
}

export function seedPayloadCache({ config }: SeedPayloadCacheArgs): void {
  if (_helpers || _seedPromise) return
  _seedPromise = (async () => {
    const payload = await getPayload({ config: await config })
    _helpers = createCacheHelpers(payload)
  })()
}

async function requireCacheHelpers(): Promise<CacheHelpers> {
  if (_helpers) return _helpers
  if (_seedPromise) {
    await _seedPromise
    if (_helpers) return _helpers
  }
  throw new Error(
    '[payload-www] seedPayloadCache({ config }) must be called before any query getter. ' +
    'Call it from createCollectionPageExports / createRootLayoutExports factory, or in your root layout.'
  )
}

export type QueryCollectionArgs<S extends string> = {
  collectionSlug: S
  slug: string
  slugField?: string
  locale: string
  draft?: boolean
  depth?: number
}

export type QueryGlobalArgs<G extends string> = {
  globalSlug: G
  locale: string
  depth?: number
  draft?: boolean
}

export type QueryListArgs<S extends string> = {
  collectionSlug: S
  slugField?: string
  locale: string
}

export type QueryDocArgs =
  | ({ globalSlug: string; locale: string; draft?: boolean })
  | ({ collectionSlug: string; slug: string; slugField?: string; locale: string; draft?: boolean; depth?: number })

export async function queryDocBySlug<S extends string>(args: QueryCollectionArgs<S>): Promise<DataFromCollectionSlug<S> | null> {
  'use cache'
  cacheLife('weeks')
  const { findDoc } = await requireCacheHelpers()
  const slugField = args.slugField ?? 'slug'
  const result = await findDoc(args.collectionSlug as CollectionSlug, {
    where: { [slugField]: { equals: args.slug } },
    locale: args.locale,
    draft: args.draft ?? false,
    // the local api skips read access by default, and that access is what hides draft-only docs
    overrideAccess: args.draft ?? false,
    depth: args.depth
  } as never)
  return (result ?? null) as unknown as DataFromCollectionSlug<S> | null
}

export async function queryGlobal<G extends string>(args: QueryGlobalArgs<G>): Promise<DataFromGlobalSlug<G> | null> {
  'use cache'
  cacheLife('weeks')
  const { findGlobal } = await requireCacheHelpers()
  try {
    // no access check, as in 1.x: a header or footer that was never published would render empty
    const result = await findGlobal(args.globalSlug as never, {
      locale: args.locale,
      draft: args.draft ?? false,
      depth: args.depth
    } as never)
    return (result ?? null) as unknown as DataFromGlobalSlug<G> | null
  } catch (error) {
    console.warn('[WWW] queryGlobal failed', { globalSlug: args.globalSlug, locale: args.locale, error: String(error) })
    return null
  }
}

export async function queryAllDocs<S extends string = string>(args: QueryListArgs<S>): Promise<DataFromCollectionSlug<S>[]> {
  'use cache'
  cacheLife('weeks')
  const { findIds, findDocByID } = await requireCacheHelpers()
  const collection = args.collectionSlug as CollectionSlug
  // findIds spreads into payload.find, which caps at 10 docs unless pagination is off
  const { ids } = await findIds(collection, { locale: args.locale, pagination: false, overrideAccess: false } as never)
  if (ids.length === 0) return []
  const docs = await Promise.all(
    ids.map((id) => findDocByID(collection, id, { locale: args.locale, overrideAccess: false } as never))
  )
  return docs.filter((d): d is NonNullable<typeof d> => d !== null) as unknown as DataFromCollectionSlug<S>[]
}

export async function queryDoc(args: QueryDocArgs) {
  if ('globalSlug' in args) return queryGlobal(args)
  return queryDocBySlug(args)
}

export async function queryAllLocaleSlugs(args: {
  collectionSlug: string
  id: number | string
  slugField?: string
}): Promise<Record<string, string> | null> {
  'use cache'
  cacheLife('weeks')
  const { findDocByID } = await requireCacheHelpers()
  const slugField = args.slugField ?? 'slug'
  const doc = await findDocByID(
    args.collectionSlug as CollectionSlug,
    args.id,
    { locale: 'all', select: { [slugField]: true } as never, overrideAccess: false }
  )
  const localeMap = doc?.[slugField]
  if (localeMap && typeof localeMap === 'object') return localeMap as unknown as Record<string, string>
  return null
}

export async function queryDocByID<S extends string = string>(args: {
  collectionSlug: S
  id: number | string
  locale: string
  draft?: boolean
  depth?: number
}): Promise<DataFromCollectionSlug<S> | null> {
  'use cache'
  cacheLife('weeks')
  const { findDocByID } = await requireCacheHelpers()
  return (await findDocByID(args.collectionSlug as CollectionSlug, args.id, {
    locale: args.locale,
    draft: args.draft ?? false,
    overrideAccess: args.draft ?? false,
    depth: args.depth
  } as never)) as DataFromCollectionSlug<S> | null
}

export { tagsFor }
