import type { DataFromCollectionSlug, DataFromGlobalSlug, ImportMap, SanitizedConfig } from 'payload'
import { getPayload } from 'payload'
import { cache } from 'react'

import { getFromImportMap } from '../../core/utils/getFromImportMap'

export const queryDocBySlug = cache(async function queryDocBySlug<S extends string>({
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
})

export const queryAllDocs = cache(async function queryAllDocs<S extends string>({
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
})

export const queryAllLocaleSlugs = cache(async function queryAllLocaleSlugs<S extends string>({
                                                                                               collectionSlug,
                                                                                               slug,
                                                                                               slugField = 'slug',
                                                                                               locale,
                                                                                               config
                                                                                             }: {
  collectionSlug: S
  slug: string
  slugField?: string
  locale: string
  config: Promise<SanitizedConfig>
}): Promise<Record<string, string> | undefined> {
  const payload = await getPayload({ config })
  // Resolve the doc by slug in the requested locale. We then read the
  // same field across all locales — if the slug field is localized
  // this returns one slug per locale; if not, every locale returns
  // the same value.
  const result = await payload.find({
    collection: collectionSlug,
    draft: false,
    limit: 1,
    pagination: false,
    overrideAccess: false,
    locale,
    where: { [slugField]: { equals: slug } },
    select: { [slugField]: true }
  })
  const doc = result.docs?.[0] as DataFromCollectionSlug<S> | undefined
  if (!doc) return undefined
  const fieldValue = (doc as Record<string, unknown>)?.[slugField]
  if (fieldValue && typeof fieldValue === 'object') {
    return fieldValue as Record<string, string>
  }
  // Non-localized slug — the same value applies to every locale.
  // Resolve the locale list from the awaited config.
  const resolved = await config
  const rawLocales: string[] = Array.isArray((resolved as { localization?: { localeCodes?: string[] } })?.localization?.localeCodes)
    ? (resolved as { localization: { localeCodes: string[] } }).localization.localeCodes
    : ((resolved as { localization?: { locales?: Array<{ code: string }> } })?.localization?.locales?.map((l) => l.code) ?? [])
  const out: Record<string, string> = {}
  for (const l of rawLocales) out[l] = String(fieldValue ?? slug)
  return out
})

export const queryGlobal = cache(async function queryGlobal<G extends string>({
                                                                                            globalSlug,
                                                                                            locale,
                                                                                            depth = 0,
                                                                                            draft = false,
                                                                                            config
                                                                                          }: {
  globalSlug: G
  locale: string
  depth?: number
  draft?: boolean
  config: Promise<SanitizedConfig>
}): Promise<DataFromGlobalSlug<G> | null> {
  const payload = await getPayload({ config })
  try {
    const global = await payload.findGlobal({
      slug: globalSlug,
      depth,
      draft,
      locale
    })
    return global as DataFromGlobalSlug<G> | null
  } catch {
    // Global not configured in the host's Payload — return null so the
    // layout renders nothing in that slot instead of crashing the page.
    return null
  }
})

export function getRenderModuleExports(
  exportName: string,
  collection: { custom?: Record<string, unknown> } | undefined,
  importMap: ImportMap
) {
  const path = collection?.custom?.path as string | undefined
  if (!path) return undefined
  const mod = getFromImportMap(path, importMap)
  return (mod as Record<string, unknown>)?.[exportName] as unknown
}
