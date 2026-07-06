import type { DataFromCollectionSlug, DataFromGlobalSlug, SanitizedConfig } from 'payload'
import { getPayload } from 'payload'
import {
  type CollectionGlobalLocaleIdentifiersArgs,
  createCollectionCacheKey
} from '../../collections/hooks/createRevalidateCollectionGlobalHook'

async function withUnstableCache<R>(
  keyParts: unknown[],
  tags: string[],
  fn: () => Promise<R>
): Promise<R> {
  const { unstable_cache } = await import('next/cache')
  return unstable_cache(fn, keyParts.map(String), { tags })()
}

export async function queryDoc(
  args: CollectionGlobalLocaleIdentifiersArgs,
  { config: configPromise }: { config: Promise<SanitizedConfig> }
) {
  return withUnstableCache(
    Object.values(args),
    [createCollectionCacheKey(args)],
    async () => {
      if ('globalSlug' in args)
        return queryGlobal({ ...args, config: configPromise })
      else
        return queryDocBySlug({ ...args, config: configPromise })
    }
  )
}

export async function queryDocBySlug<S extends string>(
  {
    collectionSlug,
    slug,
    slugField = 'slug',
    locale,
    draft = false,
    config
  }: {
    collectionSlug: S
    slug: string
    slugField?: string
    locale: string
    draft?: boolean
    config: Promise<SanitizedConfig>
  }): Promise<DataFromCollectionSlug<S> | null> {
  return withUnstableCache(
    [collectionSlug, slug, locale, draft],
    [createCollectionCacheKey({ collectionSlug, slug, locale })],
    async () => {
      const payload = await getPayload({ config })
      const result = await payload.find({
        collection: collectionSlug,
        draft,
        limit: 1,
        pagination: false,
        overrideAccess: draft,
        where: { [slugField]: { equals: slug } },
        locale
      })
      return result.docs?.[0] ?? null
    }
  )
}

export async function queryGlobal<G extends string>(
  {
    globalSlug,
    locale,
    draft = false,
    config
  }: {
    globalSlug: G
    locale: string
    depth?: number
    draft?: boolean
    config: Promise<SanitizedConfig>
  }): Promise<DataFromGlobalSlug<G> | null> {
  return withUnstableCache(
    [globalSlug, locale, draft],
    [createCollectionCacheKey({ globalSlug, locale })],
    async () => {
      const payload = await getPayload({ config })
      try {
        return await payload.findGlobal({ slug: globalSlug, draft, locale })
      } catch (error) {
        console.warn('[WWW] queryGlobal failed', { globalSlug, locale, error: String(error) })
        return null
      }
    }
  )
}


export async function queryAllDocs<S extends string>(
  {
    collectionSlug,
    slugField = 'slug',
    locale,
    config
  }: {
    collectionSlug: S
    slugField?: string
    locale: string
    config: Promise<SanitizedConfig>
  }): Promise<DataFromCollectionSlug<S>[]> {
  return withUnstableCache(
    [collectionSlug, slugField, locale],
    [createCollectionCacheKey({ collectionSlug, slug: '__all__', locale })],
    async () => {
      const payload = await getPayload({ config })
      const result = await payload.find({
        collection: collectionSlug,
        draft: false,
        limit: 1000,
        pagination: false,
        overrideAccess: false,
        select: { [slugField]: true },
        locale
      })
      return result.docs ?? []
    }
  )
}

export async function queryAllLocaleSlugs(
  {
    collectionSlug,
    id,
    slugField = 'slug',
    config
  }: {
    collectionSlug: string
    id: number | string
    slugField?: string
    config: Promise<SanitizedConfig>
  }): Promise<Record<string, string> | null> {
  const payload = await getPayload({ config })
  const doc = await payload.findByID({
    collection: collectionSlug,
    id,
    locale: 'all',
    select: { [slugField]: true }
  })
  return doc?.[slugField]
}
