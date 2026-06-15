import type { ImportMap, SanitizedConfig } from 'payload'
import { getPayload } from 'payload'
import { cache } from 'react'

import { getFromImportMap } from '../utils/getFromImportMap'

export const queryDocBySlug = cache(async function queryDocBySlug({
  collectionSlug,
  slug,
  slugField = 'slug',
  locale,
  draft = false,
  config,
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
    locale,
  })
  return result.docs?.[0] ?? null
})

export const queryAllDocs = cache(async function queryAllDocs({
  collectionSlug,
  slugField = 'slug',
  locale,
  config,
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
    locale,
  })
  return result.docs ?? []
})

export const queryAllLocaleSlugs = cache(async function queryAllLocaleSlugs({
  collectionSlug,
  slug,
  slugField = 'slug',
  locale,
  config,
}: {
  collectionSlug: string
  slug: string
  slugField?: string
  locale: string
  config: Promise<SanitizedConfig>
}): Promise<Record<string, string> | undefined> {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: collectionSlug as any,
    draft: false,
    limit: 1,
    pagination: false,
    overrideAccess: false,
    locale: 'all' as any,
    where: { [`${slugField}.${locale}`]: { equals: slug } } as any,
    select: { [slugField]: true } as any,
  })
  return (result.docs?.[0] as any)?.[slugField]
})

export function getRenderModuleExports(
  exportName: string,
  collection: { custom?: Record<string, any> } | undefined,
  importMap: ImportMap,
) {
  const path = collection?.custom?.path as string | undefined
  if (!path) return undefined
  const mod = getFromImportMap(path, importMap)
  return (mod as any)?.[exportName]
}
