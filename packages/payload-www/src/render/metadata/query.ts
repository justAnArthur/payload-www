import type { DataFromCollectionSlug, DataFromGlobalSlug, SanitizedConfig } from 'payload'
import { getPayload } from 'payload'
import { cacheTag } from 'next/cache'
import {
  type CollectionCacheKeyArgs,
  createAliasCacheKey,
  createCollectionCacheKey,
  createDraftCacheKey,
  createGlobalCacheKey,
  createListCacheKey,
} from '../../exports/cache-keys'

export type QueryCollectionArgs<S extends string> = {
  collectionSlug: S
  slug: string
  slugField?: string
  locale: string
  draft?: boolean
  depth?: number
  extraCacheTags?: string[]
  config: Promise<SanitizedConfig>
}

export type QueryGlobalArgs<G extends string> = {
  globalSlug: G
  locale: string
  depth?: number
  draft?: boolean
  extraCacheTags?: string[]
  config: Promise<SanitizedConfig>
}

export type QueryListArgs<S extends string> = {
  collectionSlug: S
  slugField?: string
  locale: string
  extraCacheTags?: string[]
  config: Promise<SanitizedConfig>
}

export type QueryDocArgs =
  | ({ globalSlug: string; locale: string; draft?: boolean; extraCacheTags?: string[] })
  | ({ collectionSlug: string; slug: string; slugField?: string; locale: string; draft?: boolean; depth?: number; extraCacheTags?: string[] })

// cacheTag only works inside a 'use cache' scope. The queries below are
// called from both cached scopes (the host's page) and uncached ones
// (generateStaticParams, generateSitemap at build time). The try/catch
// keeps the call site valid in both.
const safeCacheTag = (...tags: string[]): void => {
  try {
    cacheTag(...tags)
  } catch {
    // not inside a 'use cache' scope — tags are no-ops here
  }
}

export async function queryDocBySlug<S extends string>(args: QueryCollectionArgs<S>): Promise<DataFromCollectionSlug<S> | null> {
  const payload = await getPayload({ config: await args.config })
  const slugField = args.slugField ?? 'slug'
  const baseTag = createCollectionCacheKey({ collectionSlug: args.collectionSlug, slug: args.slug, locale: args.locale })
  safeCacheTag(
    baseTag,
    createAliasCacheKey({ collectionSlug: args.collectionSlug, slug: args.slug, idField: slugField }),
    createDraftCacheKey(baseTag),
    ...(args.extraCacheTags ?? [])
  )
  const result = await payload.find({
    collection: args.collectionSlug,
    draft: args.draft ?? false,
    limit: 1,
    pagination: false,
    overrideAccess: args.draft ?? false,
    where: { [slugField]: { equals: args.slug } },
    locale: args.locale,
    depth: args.depth ?? 0
  })
  return result.docs?.[0] ?? null
}

export async function queryGlobal<G extends string>(args: QueryGlobalArgs<G>): Promise<DataFromGlobalSlug<G> | null> {
  const payload = await getPayload({ config: await args.config })
  const baseTag = createGlobalCacheKey({ globalSlug: args.globalSlug, locale: args.locale })
  safeCacheTag(
    baseTag,
    createDraftCacheKey(baseTag),
    ...(args.extraCacheTags ?? [])
  )
  try {
    return await payload.findGlobal({ slug: args.globalSlug, draft: args.draft ?? false, locale: args.locale })
  } catch (error) {
    console.warn('[WWW] queryGlobal failed', { globalSlug: args.globalSlug, locale: args.locale, error: String(error) })
    return null
  }
}

export async function queryAllDocs<S extends string>(args: QueryListArgs<S>): Promise<DataFromCollectionSlug<S>[]> {
  const payload = await getPayload({ config: await args.config })
  const listTag = createListCacheKey({ collectionSlug: args.collectionSlug, scope: '_all', locale: args.locale })
  safeCacheTag(listTag, ...(args.extraCacheTags ?? []))
  const result = await payload.find({
    collection: args.collectionSlug,
    draft: false,
    limit: 1000,
    pagination: false,
    overrideAccess: false,
    locale: args.locale
  })
  return result.docs ?? []
}

export async function queryDoc(
  args: QueryDocArgs,
  { config: configPromise }: { config: Promise<SanitizedConfig> }
) {
  if ('globalSlug' in args)
    return queryGlobal({ ...args, config: configPromise })
  return queryDocBySlug({ ...args, config: configPromise })
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
  const payload = await getPayload({ config: await config })
  const doc = await payload.findByID({
    collection: collectionSlug,
    id,
    locale: 'all',
    select: { [slugField]: true }
  })
  return doc?.[slugField]
}

export type { CollectionCacheKeyArgs }
