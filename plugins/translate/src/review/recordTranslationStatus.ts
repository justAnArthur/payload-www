import type { PayloadRequest, SanitizedCollectionConfig, SanitizedGlobalConfig } from 'payload'

import { collectTranslatableFields } from './collectTranslatableFields'
import { TRANSLATION_STATUS_SLUG } from './constants'
import { entityKey } from './entityKey'
import { sourceHash } from './sourceHash'

type Args = {
  req: PayloadRequest
  collectionSlug?: string
  globalSlug?: string
  id?: number | string
  locale: string
  config: SanitizedCollectionConfig | SanitizedGlobalConfig
  dataFrom: Record<string, unknown>
  /** set when a person marks the locale reviewed rather than a job translating it */
  reviewedBy?: string
}

export const upsertTranslationStatus = async (
  req: PayloadRequest,
  entity: string,
  locale: string,
  data: Record<string, unknown>
) => {
  if (!req.payload.collections[TRANSLATION_STATUS_SLUG as never]) return

  const existing = await req.payload.find({
    collection: TRANSLATION_STATUS_SLUG as never,
    where: { and: [{ entity: { equals: entity } }, { locale: { equals: locale } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req
  })

  const row = existing.docs[0] as { id: number | string } | undefined

  if (row)
    await req.payload.update({ collection: TRANSLATION_STATUS_SLUG as never, id: row.id, data, overrideAccess: true, req })
  else
    await req.payload.create({ collection: TRANSLATION_STATUS_SLUG as never, data: { entity, locale, ...data } as never, overrideAccess: true, req })
}

/** stores the source fingerprint a locale was translated or reviewed against */
export const recordTranslationStatus = async ({ req, collectionSlug, globalSlug, id, locale, config, dataFrom, reviewedBy }: Args) => {
  const hash = sourceHash(collectTranslatableFields({
    config,
    dataFrom,
    dataTarget: {},
    options: req.payload.config.custom?.translator?._options
  }))

  const now = new Date().toISOString()

  await upsertTranslationStatus(
    req,
    entityKey({ collectionSlug, globalSlug, id }),
    locale,
    reviewedBy
      ? { reviewedHash: hash, reviewedAt: now, reviewedBy }
      : { sourceHash: hash, translatedAt: now }
  )
}
