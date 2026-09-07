import { revalidateTag } from 'next/cache'
import {
  createAliasCacheKey,
  createAllCacheKey,
  createCollectionCacheKey,
  createDraftCacheKey,
  createGlobalCacheKey,
  createListCacheKey
} from '@justanarthur/payload-www/cache-keys'

// Reference revalidation helpers for the demo. The lib no longer ships
// revalidation hooks — the cache-key vocabulary it owns is exported via
// `@justanarthur/payload-www/cache-keys`, and any revalidation strategy
// (this minimal reference, or a host plugin like @pro-laico/payload-revalidate)
// must import the tag builders from there to stay in sync.

export function revalidateDoc(args: {
  collection: string
  slug: string
  locale: string
  idField?: string
  draft?: boolean
}) {
  const baseTag = createCollectionCacheKey({
    collectionSlug: args.collection,
    slug: args.slug,
    locale: args.locale
  })
  revalidateTag(baseTag, 'weeks')
  revalidateTag(
    createAliasCacheKey({
      collectionSlug: args.collection,
      slug: args.slug,
      idField: args.idField ?? 'slug'
    }),
    'weeks'
  )
  if (args.draft) revalidateTag(createDraftCacheKey(baseTag), 'weeks')
}

export function revalidateList(args: {
  collection: string
  scope?: string
  locale: string
}) {
  revalidateTag(
    createListCacheKey({
      collectionSlug: args.collection,
      scope: args.scope,
      locale: args.locale
    }),
    'weeks'
  )
}

export function revalidateGlobal(args: { global: string; locale: string }) {
  revalidateTag(
    createGlobalCacheKey({ globalSlug: args.global, locale: args.locale }),
    'weeks'
  )
}

export function revalidateAll() {
  revalidateTag(createAllCacheKey(), 'weeks')
}
