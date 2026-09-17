import type { CollectionSlug, PayloadRequest, Where } from 'payload'

import { TRANSLATE_WORKFLOW_SLUG } from '../jobs/constants'
import type { TranslatorConfig } from '../types'
import type { TranslateMode } from '../utils/translateMode'
import { entityKey } from './entityKey'
import { type EntityReview, loadCollectionReview, loadGlobalsReview, readLocales } from './loadReview'

const JOBS_SLUG = 'payload-jobs'

type JobInput = { collection?: string; global?: string; id?: number | string; toLocales?: string[]; toLocale?: string }

const pendingWhere: Where = {
  and: [
    { workflowSlug: { equals: TRANSLATE_WORKFLOW_SLUG } },
    { completedAt: { exists: false } },
    { hasError: { not_equals: true } }
  ]
}

export const hasTranslateWorkflow = (req: PayloadRequest) =>
  Boolean(req.payload.config.jobs?.workflows?.some((workflow) => workflow.slug === TRANSLATE_WORKFLOW_SLUG)) &&
  Boolean(req.payload.collections[JOBS_SLUG as never])

/** queued, running and recently failed translate workflows */
export const loadJobsProgress = async (req: PayloadRequest) => {
  if (!hasTranslateWorkflow(req)) return null

  const count = (where: Where) =>
    req.payload.count({ collection: JOBS_SLUG as never, where, overrideAccess: true, req }).then(({ totalDocs }) => totalDocs)

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const [pending, running, failed] = await Promise.all([
    count(pendingWhere),
    count({ and: [...(pendingWhere.and ?? []), { processing: { equals: true } }] }),
    count({ and: [{ workflowSlug: { equals: TRANSLATE_WORKFLOW_SLUG } }, { hasError: { equals: true } }, { updatedAt: { greater_than: dayAgo } }] })
  ])

  return { pending, running, failed }
}

/** `entity|locale` pairs a queued workflow already covers, so a second bulk run doesn't double them */
const loadPendingPairs = async (req: PayloadRequest) => {
  const { docs } = await req.payload.find({
    collection: JOBS_SLUG as never,
    where: pendingWhere,
    pagination: false,
    depth: 0,
    overrideAccess: true,
    req
  })

  const pairs = new Set<string>()

  for (const { input } of docs as unknown as { input?: JobInput }[]) {
    if (!input) continue
    const key = entityKey({ collectionSlug: input.collection, globalSlug: input.global, id: input.id })
    for (const locale of input.toLocales ?? (input.toLocale ? [input.toLocale] : [])) pairs.add(`${key}|${locale}`)
  }

  return pairs
}

const incompleteLocales = (entity: EntityReview, locales: string[]) =>
  locales.filter((locale) => {
    const review = entity.locales[locale]
    return review && (review.summary.coverage < 100 || review.summary.slugMissing)
  })

/**
 * queues one translate workflow per incomplete document, covering only its incomplete locales.
 * documents are reviewed page by page so large collections don't load at once.
 */
export const queueBulkTranslation = async ({ req, tab, locale, mode }: {
  req: PayloadRequest
  tab: string
  locale?: string
  mode: TranslateMode
}) => {
  const pluginConfig = req.payload.config.custom?.translator as TranslatorConfig
  const { defaultLocale, targetLocales } = readLocales(req)
  const locales = locale ? [locale] : targetLocales
  const resolver = pluginConfig.resolvers[0]?.key
  const pending = await loadPendingPairs(req)

  let queuedDocuments = 0
  let queuedLocales = 0
  let skippedPending = 0

  const queue = async (entity: EntityReview) => {
    const toLocales = incompleteLocales(entity, locales).filter((each) => {
      const already = pending.has(`${entity.key}|${each}`)
      if (already) skippedPending++
      return !already
    })

    if (!toLocales.length) return

    await req.payload.jobs.queue({
      req,
      workflow: TRANSLATE_WORKFLOW_SLUG as never,
      input: {
        id: entity.id,
        collection: entity.collectionSlug,
        global: entity.globalSlug,
        updatedAt: new Date().toISOString(),
        fromLocale: defaultLocale,
        toLocales,
        resolver,
        mode
      } as never
    })

    queuedDocuments++
    queuedLocales += toLocales.length
  }

  if (tab === 'globals') {
    const { entities } = await loadGlobalsReview({ req, globalSlugs: pluginConfig.globals as string[] })
    for (const entity of entities) await queue(entity)
  } else {
    for (let page = 1; ; page++) {
      const review = await loadCollectionReview({ req, collectionSlug: tab as CollectionSlug, page, limit: 50 })
      for (const entity of review.entities) await queue(entity)
      if (page >= review.totalPages) break
    }
  }

  return { queuedDocuments, queuedLocales, skippedPending }
}

/** runs a few queued translate workflows now instead of waiting for the job runner */
export const runQueuedTranslations = async (req: PayloadRequest, limit = 3) => {
  await req.payload.jobs.run({
    limit,
    where: { workflowSlug: { equals: TRANSLATE_WORKFLOW_SLUG } },
    req
  })

  return loadJobsProgress(req)
}
