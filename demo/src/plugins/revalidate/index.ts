import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, GlobalAfterChangeHook, Plugin } from 'payload'
import { revalidateAll, revalidateDoc, revalidateGlobal, revalidateList } from '../../lib/revalidate'

// Minimal reference revalidation plugin. The lib no longer ships revalidation
// hooks of its own (see plan § 1 + § 4): the cache side of the atomic model
// lives in the lib's query layer (`packages/payload-www/src/render/metadata/query.ts`),
// and the canonical tag vocabulary is exported from `@justanarthur/payload-www/cache-keys`.
//
// This plugin is a reference implementation — production hosts use a full
// plugin (e.g. `@pro-laico/payload-revalidate`) for relation/join walks and
// lexical richText support. This one is deliberately small and per-doc.

function safeSlug(value: unknown): string | undefined {
  if (typeof value === 'string' && value.length > 0) return value
  if (typeof value === 'number') return String(value)
  return undefined
}

function safeLocale(req: { locale?: unknown } | undefined): string {
  const value = req?.locale
  if (typeof value === 'string' && value !== 'all' && value !== '*' && value.length > 0) return value
  return 'en'
}

const afterChangeDoc: CollectionAfterChangeHook = ({ doc, previousDoc, operation, req }) => {
  const slug = safeSlug((doc as { slug?: unknown }).slug)
  if (!slug) return doc
  const collection = (req as { collection?: { slug?: string } }).collection?.slug
  if (!collection) return doc
  const locale = safeLocale(req)
  const idField = 'slug'

  revalidateDoc({ collection, slug, locale, idField })
  if (operation === 'create' || operation === 'update' || previousDoc == null) {
    revalidateList({ collection, locale })
  }
  return doc
}

const afterChangeGlobal: GlobalAfterChangeHook = ({ doc, req }) => {
  const slug = (doc as { slug?: string }).slug
  if (!slug) return doc
  const global = (req as { global?: { slug?: string } }).global?.slug
  if (!global) return doc
  revalidateGlobal({ global, locale: safeLocale(req) })
  return doc
}

const afterDelete: CollectionAfterDeleteHook = ({ doc, req }) => {
  const slug = safeSlug((doc as { slug?: unknown }).slug)
  if (!slug) return doc
  const collection = (req as { collection?: { slug?: string } }).collection?.slug
  if (!collection) return doc
  const locale = safeLocale(req)
  revalidateDoc({ collection, slug, locale })
  revalidateList({ collection, locale })
  revalidateAll()
}

export const revalidatePlugin =
  (): Plugin =>
  (incomingConfig) => {
    const config = { ...incomingConfig }
    config.collections = (config.collections ?? []).map((collection) => {
      if (collection.slug.startsWith('payload-') || collection.slug === 'users' || collection.slug === 'media') {
        return collection
      }
      return {
        ...collection,
        hooks: {
          ...(collection.hooks ?? {}),
          afterChange: [...(collection.hooks?.afterChange ?? []), afterChangeDoc],
          afterDelete: [...(collection.hooks?.afterDelete ?? []), afterDelete]
        }
      }
    })
    config.globals = (config.globals ?? []).map((global) => ({
      ...global,
      hooks: {
        ...(global.hooks ?? {}),
        afterChange: [...(global.hooks?.afterChange ?? []), afterChangeGlobal]
      }
    }))
    return config
  }

export default revalidatePlugin
