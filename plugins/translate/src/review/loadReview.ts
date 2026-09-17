import type {
  CollectionSlug,
  GlobalSlug,
  PayloadRequest,
  SanitizedCollectionConfig,
  SanitizedGlobalConfig
} from 'payload'

import type { TranslatorConfig } from '../types'
import { buildCrossLocaleTexts } from '../utils/crossLocale'
import { collectTranslatableFields } from './collectTranslatableFields'
import { computeStatus, type FieldStatus, type LocaleSummary } from './computeStatus'
import { TRANSLATION_STATUS_SLUG } from './constants'
import { entityKey } from './entityKey'
import { sourceHash } from './sourceHash'
import { loadWrongLanguageCheck, type WrongLanguageCheck } from '../utils/languageDetector'

export type LocaleReview = {
  summary: LocaleSummary
  /** translated from an older version of the source */
  stale: boolean
  /** a person confirmed this locale against the current source */
  reviewed: boolean
}

export type EntityReview = {
  key: string
  label: string
  collectionSlug?: string
  globalSlug?: string
  id?: number | string
  locales: Record<string, LocaleReview>
}

type Doc = Record<string, unknown> & { id?: number | string }

type StatusRow = { entity: string; locale: string; sourceHash?: string; reviewedHash?: string; reviewedAt?: string; reviewedBy?: string; translatedAt?: string }

export const readLocales = (req: PayloadRequest) => {
  const localization = req.payload.config.localization
  if (!localization) return { defaultLocale: '', targetLocales: [] as string[] }

  const codes = localization.locales.map((each) => typeof each === 'string' ? each : each.code)
  return { defaultLocale: localization.defaultLocale, targetLocales: codes.filter((code) => code !== localization.defaultLocale) }
}

const pluginOptions = (req: PayloadRequest) => (req.payload.config.custom?.translator as TranslatorConfig | undefined)

const loadStatusRows = async (req: PayloadRequest, keys: string[]): Promise<StatusRow[]> => {
  if (!keys.length || !req.payload.collections[TRANSLATION_STATUS_SLUG as never]) return []

  const { docs } = await req.payload.find({
    collection: TRANSLATION_STATUS_SLUG as never,
    where: { entity: { in: keys } },
    pagination: false,
    depth: 0,
    overrideAccess: false,
    req
  })

  return docs as unknown as StatusRow[]
}

/** the wrong-language check, unless the host turned `languageDetection` off */
export const loadLanguageCheck = (req: PayloadRequest) =>
  pluginOptions(req)?.languageDetection === false
    ? Promise.resolve(null)
    : loadWrongLanguageCheck(readLocales(req).targetLocales.concat(readLocales(req).defaultLocale))

/**
 * Reviews every target locale of one entity. Fields are collected once per locale so the
 * cross-locale duplicate check can see the same field across all of them — the fingerprint
 * of a translation filed under the wrong locale.
 */
const reviewEntity = (
  config: SanitizedCollectionConfig | SanitizedGlobalConfig,
  source: Doc,
  targetByLocale: Record<string, Doc | undefined>,
  targetLocales: string[],
  hash: string,
  rowByLocale: (locale: string) => StatusRow | undefined,
  req: PayloadRequest,
  check: WrongLanguageCheck | null
): Record<string, LocaleReview & { fields: FieldStatus[] }> => {
  const options = pluginOptions(req)?._options
  const fieldsPerLocale = targetLocales.map((locale) => ({
    locale,
    fields: collectTranslatableFields({
      config,
      dataFrom: source,
      dataTarget: targetByLocale[locale] ?? {},
      options
    })
  }))
  const crossLocale = buildCrossLocaleTexts(fieldsPerLocale)

  return Object.fromEntries(fieldsPerLocale.map(({ locale, fields }) => {
    const row = rowByLocale(locale)
    const { fields: _fields, ...review } = {
      ...computeStatus(fields, { locale, check, crossLocale }),
      stale: Boolean(row?.sourceHash) && row?.sourceHash !== hash,
      reviewed: Boolean(row?.reviewedHash) && row?.reviewedHash === hash
    }
    return [locale, review]
  }))
}

const labelOf = (config: SanitizedCollectionConfig, doc: Doc) => {
  const title = doc[config.admin?.useAsTitle ?? 'id']
  return typeof title === 'string' && title.trim() ? title : `#${doc.id}`
}

const globalLabel = (config: SanitizedGlobalConfig) => typeof config.label === 'string' ? config.label : config.slug

const hashOf = (config: SanitizedCollectionConfig | SanitizedGlobalConfig, source: Doc, req: PayloadRequest) =>
  sourceHash(collectTranslatableFields({ config, dataFrom: source, dataTarget: {}, options: pluginOptions(req)?._options }))

/** a page of documents from one collection with a summary for every target locale */
export const loadCollectionReview = async ({ req, collectionSlug, page = 1, limit = 25 }: {
  req: PayloadRequest
  collectionSlug: string
  page?: number
  limit?: number
}) => {
  const config = req.payload.collections[collectionSlug as CollectionSlug]?.config
  if (!config) throw new Error(`unknown collection ${collectionSlug}`)

  const { defaultLocale, targetLocales } = readLocales(req)
  const check = await loadLanguageCheck(req)

  const sources = await req.payload.find({
    collection: collectionSlug as CollectionSlug,
    locale: defaultLocale as never,
    fallbackLocale: false as never,
    depth: 0,
    limit,
    page,
    sort: '-updatedAt',
    overrideAccess: false,
    req
  })

  const ids = sources.docs.map((doc) => (doc as Doc).id)

  // one req is shared and the local api writes `req.locale`, so locale reads run one at a time
  const targets: Record<string, Map<string, Doc>> = {}

  for (const locale of targetLocales) {
    const { docs } = ids.length
      ? await req.payload.find({
        collection: collectionSlug as CollectionSlug,
        locale: locale as never,
        fallbackLocale: false as never,
        depth: 0,
        where: { id: { in: ids } },
        pagination: false,
        overrideAccess: false,
        req
      })
      : { docs: [] }

    targets[locale] = new Map(docs.map((doc) => [String((doc as Doc).id), doc as Doc]))
  }

  const keys = ids.map((id) => entityKey({ collectionSlug, id }))
  const rows = await loadStatusRows(req, keys)

  const entities: EntityReview[] = sources.docs.map((doc) => {
    const source = doc as Doc
    const key = entityKey({ collectionSlug, id: source.id })
    const hash = hashOf(config, source, req)

    return {
      key,
      label: labelOf(config, source),
      collectionSlug,
      id: source.id,
      locales: reviewEntity(
        config,
        source,
        Object.fromEntries(targetLocales.map((locale) => [locale, targets[locale].get(String(source.id))])),
        targetLocales,
        hash,
        (locale) => rows.find((row) => row.entity === key && row.locale === locale),
        req,
        check
      )
    }
  })

  return {
    entities,
    locales: targetLocales,
    page: sources.page ?? page,
    totalPages: sources.totalPages,
    totalDocs: sources.totalDocs
  }
}

/** every configured global with a summary for every target locale */
export const loadGlobalsReview = async ({ req, globalSlugs }: { req: PayloadRequest; globalSlugs: string[] }) => {
  const { defaultLocale, targetLocales } = readLocales(req)
  const check = await loadLanguageCheck(req)
  const rows = await loadStatusRows(req, globalSlugs.map((globalSlug) => entityKey({ globalSlug })))

  const entities: EntityReview[] = []

  for (const globalSlug of globalSlugs) {
    const config = req.payload.config.globals.find((each) => each.slug === globalSlug)
    if (!config) continue

    const read = (locale: string) => req.payload.findGlobal({
      slug: globalSlug as GlobalSlug,
      locale: locale as never,
      fallbackLocale: false as never,
      depth: 0,
      overrideAccess: false,
      req
    }) as Promise<Doc>

    const source = await read(defaultLocale)
    const hash = hashOf(config, source, req)
    const key = entityKey({ globalSlug })

    const targetByLocale: Record<string, Doc | undefined> = {}
    for (const locale of targetLocales) {
      targetByLocale[locale] = await read(locale)
    }

    const locales = reviewEntity(
      config, source, targetByLocale, targetLocales, hash,
      (locale) => rows.find((row) => row.entity === key && row.locale === locale), req, check
    )

    entities.push({ key, label: globalLabel(config), globalSlug, locales })
  }

  return { entities, locales: targetLocales }
}

export const parseEntityKey = (key: string) => {
  const [scope, ...rest] = key.split(':')
  const value = rest.join(':')
  return scope === 'global' ? { globalSlug: value } : { collectionSlug: scope, id: value }
}

/** field-level review of one entity in one target locale */
export const loadEntityLocaleReview = async ({ req, entity, locale }: { req: PayloadRequest; entity: string; locale: string }) => {
  const { defaultLocale } = readLocales(req)
  const { collectionSlug, globalSlug, id } = parseEntityKey(entity)

  const config = globalSlug
    ? req.payload.config.globals.find((each) => each.slug === globalSlug)
    : req.payload.collections[collectionSlug as CollectionSlug]?.config

  if (!config) throw new Error(`unknown entity ${entity}`)

  const read = (readLocale: string) => (globalSlug
    ? req.payload.findGlobal({ slug: globalSlug as GlobalSlug, locale: readLocale as never, fallbackLocale: false as never, depth: 0, overrideAccess: false, req })
    : req.payload.findByID({ collection: collectionSlug as CollectionSlug, id: id as string, locale: readLocale as never, fallbackLocale: false as never, depth: 0, overrideAccess: false, req })) as Promise<Doc>

  const source = await read(defaultLocale)
  const rows = await loadStatusRows(req, [entity])
  const row = rows.find((each) => each.locale === locale)

  // every locale's fields feed the cross-locale map; only the requested locale's status is returned
  const { targetLocales } = readLocales(req)
  const targetByLocale: Record<string, Doc | undefined> = {}
  for (const each of targetLocales) {
    targetByLocale[each] = await read(each)
  }

  const review = reviewEntity(
    config, source, targetByLocale, targetLocales, hashOf(config, source, req),
    (each) => rows.find((row2) => row2.locale === each), req, await loadLanguageCheck(req)
  )[locale]

  return {
    ...review,
    entity,
    locale,
    defaultLocale,
    collectionSlug,
    globalSlug,
    id,
    label: globalSlug
      ? globalLabel(config as SanitizedGlobalConfig)
      : labelOf(config as SanitizedCollectionConfig, source),
    translatedAt: row?.translatedAt,
    reviewedAt: row?.reviewedAt,
    reviewedBy: row?.reviewedBy,
    lastJob: await loadLastJob(req, { collectionSlug, globalSlug, id }, locale)
  }
}

type JobRow = {
  id: number | string
  input?: { collection?: string; global?: string; id?: number | string; toLocales?: string[] }
  completedAt?: string
  hasError?: boolean
  error?: unknown
  processing?: boolean
  createdAt?: string
}

/** the latest auto-translate workflow that covered this entity and locale, if jobs are kept */
const loadLastJob = async (
  req: PayloadRequest,
  { collectionSlug, globalSlug, id }: { collectionSlug?: string; globalSlug?: string; id?: number | string },
  locale: string
) => {
  if (!req.payload.collections['payload-jobs' as never]) return null

  try {
    const { docs } = await req.payload.find({
      collection: 'payload-jobs' as never,
      sort: '-createdAt',
      limit: 100,
      depth: 0,
      overrideAccess: true,
      req
    })

    const job = (docs as unknown as JobRow[]).find(({ input }) =>
      input &&
      (globalSlug ? input.global === globalSlug : input.collection === collectionSlug && String(input.id) === String(id)) &&
      (!Array.isArray(input.toLocales) || input.toLocales.includes(locale))
    )

    if (!job) return null

    return {
      id: job.id,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      processing: Boolean(job.processing),
      error: job.hasError ? (typeof job.error === 'string' ? job.error : JSON.stringify(job.error)) : undefined
    }
  } catch {
    return null
  }
}
