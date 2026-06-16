import type { ImportMap, SanitizedConfig } from 'payload'
import { getPayload } from 'payload'
import { cache } from 'react'

import { getFromImportMap } from '../../core/utils/getFromImportMap'

export const queryDocBySlug = cache(async function queryDocBySlug({
                                                                    collectionSlug,
                                                                    slug,
                                                                    slugField = 'slug',
                                                                    locale,
                                                                    draft = false,
                                                                    config
                                                                  }: {
  collectionSlug: string
  slug: string
  slugField?: string
  locale: string
  draft?: boolean
  config: Promise<SanitizedConfig>
}): Promise<Record<string, any> | null> {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: collectionSlug as any,
    draft,
    limit: 1,
    pagination: false,
    overrideAccess: draft,
    where: { [slugField]: { equals: slug } },
    locale
  })
  return result.docs?.[0] ?? null
})

export const queryAllDocs = cache(async function queryAllDocs({
                                                                collectionSlug,
                                                                slugField = 'slug',
                                                                locale,
                                                                config
                                                              }: {
  collectionSlug: string
  slugField?: string
  locale: string
  config: Promise<SanitizedConfig>
}): Promise<Record<string, any>[]> {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: collectionSlug as any,
    draft: false,
    limit: 1000,
    pagination: false,
    overrideAccess: false,
    select: { [slugField]: true },
    locale
  })
  return result.docs ?? []
})

export const queryAllLocaleSlugs = cache(async function queryAllLocaleSlugs({
                                                                              collectionSlug,
                                                                              slug,
                                                                              slugField = 'slug',
                                                                              locale,
                                                                              config
                                                                            }: {
  collectionSlug: string
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
    collection: collectionSlug as any,
    draft: false,
    limit: 1,
    pagination: false,
    overrideAccess: false,
    locale,
    where: { [slugField]: { equals: slug } },
    select: { [slugField]: true } as any
  })
  const doc = result.docs?.[0] as any
  if (!doc) return undefined
  const fieldValue = doc?.[slugField]
  if (fieldValue && typeof fieldValue === 'object') {
    return fieldValue as Record<string, string>
  }
  // Non-localized slug — the same value applies to every locale.
  // Resolve the locale list from the awaited config.
  const resolved = await config
  const rawLocales: string[] = Array.isArray((resolved as any)?.localization?.localeCodes)
    ? (resolved as any).localization.localeCodes
    : ((resolved as any)?.localization?.locales?.map((l: any) => l.code) ?? [])
  const out: Record<string, string> = {}
  for (const l of rawLocales) out[l] = String(fieldValue ?? slug)
  return out
})

export function getRenderModuleExports(
  exportName: string,
  collection: { custom?: Record<string, any> } | undefined,
  importMap: ImportMap
) {
  const path = collection?.custom?.path as string | undefined
  if (!path) return undefined
  const mod = getFromImportMap(path, importMap)
  return (mod as any)?.[exportName]
}
