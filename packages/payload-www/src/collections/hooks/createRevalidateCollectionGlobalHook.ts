import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, GlobalAfterChangeHook } from 'payload'
import { revalidateTag } from "next/cache"

export function createRevalidateCollectionGlobalHook() {
  const afterChangeDeleteHook: (CollectionAfterChangeHook & CollectionAfterDeleteHook) | (GlobalAfterChangeHook) = async (
    { doc, req, ...args }: any
  ) => {
    const previousDoc = 'previousDoc' in args ? args.previousDoc : null,
      locale = req.locale as string

    function revalidate(args: Omit<CollectionGlobalLocaleIdentifiersArgs, 'locale'>) { // @ts-ignore
      try {
        revalidateTag(createCollectionCacheKey({ ...args, locale }), 'max')
      } catch (error) {
        console.error(error)
      }
    }

    if ('collection' in args) {
      ;[
        doc && doc._status !== 'draft' && doc.slug,
        previousDoc && previousDoc._status === 'published' && previousDoc.slug
      ]
        .filter(slug => slug !== undefined && slug !== false)
        .map(slug =>
          revalidate({ collectionSlug: args.collection.slug, slug: slug! }))
    } else {
      revalidate({ globalSlug: args.global.slug })
    }

    // todo sitemap caching and revalidation

    return doc
  }

  return ({ afterChange: afterChangeDeleteHook, afterDelete: afterChangeDeleteHook })
}

export type CollectionGlobalLocaleIdentifiersArgs =
  ({ collectionSlug: string, slug: string } | { globalSlug: string }) & { locale: string }

export function createCollectionCacheKey(args: CollectionGlobalLocaleIdentifiersArgs) {
  return `${'globalSlug' in args ? args.globalSlug : args.collectionSlug + args.slug}_${args.locale}`
}
