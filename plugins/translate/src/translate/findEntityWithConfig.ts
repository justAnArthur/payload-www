import type {
  CollectionSlug,
  GlobalSlug,
  PayloadRequest,
  SanitizedCollectionConfig,
  SanitizedGlobalConfig,
  TypeWithID
} from 'payload'
import { APIError, isolateObjectProperty } from 'payload'

/**
 * Concurrent translate jobs share one `req` (the jobs runner isolates only `transactionID`),
 * and every local API call writes `req.locale`/`req.fallbackLocale` onto it. Payload resolves
 * localized reads and writes lazily from `req.locale` mid-flight, so without isolation one
 * job's locale can decide where another job's values land. Each call gets its own copy.
 */
export const isolateReqLocale = (req: PayloadRequest): PayloadRequest =>
  isolateObjectProperty(req, ['locale', 'fallbackLocale'])

type Args = {
  collectionSlug?: string
  globalSlug?: string
  id?: number | string
  locale: string
  overrideAccess?: boolean
  req: PayloadRequest
}

export type Doc = Record<string, unknown> & TypeWithID

const findConfigBySlug = (
  slug: string,
  enities: SanitizedCollectionConfig[] | SanitizedGlobalConfig[]
) => enities.find((entity) => entity.slug === slug)

export const findEntityWithConfig = async (
  args: Args
): Promise<{
  config: SanitizedCollectionConfig | SanitizedGlobalConfig
  doc: Doc
}> => {
  const { collectionSlug, globalSlug, id, locale, overrideAccess, req } = args

  if (!collectionSlug && !globalSlug) throw new APIError('Bad Request', 400)

  const { payload } = req

  const { config } = payload

  const isGlobal = !!globalSlug

  if (!isGlobal && !id) throw new APIError('Bad Request', 400)

  const entityConfig = isGlobal
    ? findConfigBySlug(globalSlug, config.globals)
    : findConfigBySlug(collectionSlug as string, config.collections)

  if (!entityConfig) throw new APIError('Bad Request', 400)

  const isolatedReq = isolateReqLocale(req)

  const docPromise = isGlobal
    ? payload.findGlobal({
        depth: 0,
        fallbackLocale: false,
        locale: locale as any,
        overrideAccess,
        req: isolatedReq,
        slug: args.globalSlug as GlobalSlug
      })
    : payload.findByID({
        collection: collectionSlug as CollectionSlug,
        depth: 0,
        fallbackLocale: false,
        id: id as number | string,
        locale: locale as any,
        overrideAccess,
        req: isolatedReq
      })

  const doc = (await docPromise) as any

  return {
    config: entityConfig,
    doc
  }
}
