import type { CollectionAfterChangeHook } from 'payload'

import { TRANSLATE_WORKFLOW_SLUG } from './constants'

// We accept any Document shape — the hook only reads `_status`, `id`,
// and `updatedAt` from the doc, all of which Payload attaches
// regardless of the collection's specific field schema.
type AnyDoc = { _status?: string; id?: number | string; updatedAt?: string | Date }

export type CreateAutoTranslateCollectionHookOptions = {
  /**
   * The collection's slug. Used to populate the workflow's
   * `collection` input so the queued task targets the right entity.
   */
  collectionSlug: string
  /**
   * Source-of-truth locale. The hook only fires when the request
   * is operating **in** this locale — edits to a non-default locale
   * don't fan out (those edits would be translations of translations).
   *
   * Falls back to `req.payload.config.localization.defaultLocale`
   * at request time when omitted.
   */
  defaultLocale?: string
  /**
   * Target locales the workflow fans out to. Defaults to every
   * locale declared on `req.payload.config.localization.locales`
   * **except** the default locale.
   */
  targetLocales?: string[]
  /**
   * Only fan out when the doc is published. Default: `true`.
   * Keeps draft autosaves from triggering per-locale jobs.
   * Set `false` if your host treats drafts as valid translation
   * sources.
   */
  onlyOnPublished?: boolean
  /**
   * Workflow slug the hook queues. Must match the slug of the
   * workflow registered in
   * `payload.config.ts → jobs: { workflows: [...] }`.
   * Default: `'translateEntityToLocales'`.
   */
  workflowSlug?: string
  /**
   * Resolver key the queued task should call. Must match a `key`
   * declared in `translator({ resolvers: [...] })`. Default: the
   * first registered resolver's key (resolved at request time),
   * which the workflow forwards to the per-locale task as the
   * `resolver` input.
   */
  resolverKey?: string
}

/**
 * Build a `CollectionAfterChangeHook` that schedules the
 * auto-translation workflow for every non-default locale.
 *
 * Skip rules (any one is sufficient):
 *
 * - `context.disableAutoTranslate` is set (lets seed scripts and
 *   tests opt out).
 * - `req.locale` is missing or doesn't match `defaultLocale`.
 * - `req.user` is missing (system-initiated changes shouldn't
 *   kick off LLM-billed jobs).
 * - `onlyOnPublished` (default `true`) is enabled and the doc's
 *   `_status` is not `'published'`.
 * - The resolved target locale list is empty (e.g. single-locale
 *   site).
 */
export function createAutoTranslateCollectionHook(
  options: CreateAutoTranslateCollectionHookOptions
): { afterChange: CollectionAfterChangeHook } {
  const {
    collectionSlug,
    defaultLocale: defaultLocaleOption,
    targetLocales: targetLocalesOption,
    onlyOnPublished = true,
    workflowSlug = TRANSLATE_WORKFLOW_SLUG
  } = options

  const afterChange: CollectionAfterChangeHook = async ({ doc, req }) => {
    if (shouldSkipAutoTranslate(req.context)) return doc

    const typed = doc as AnyDoc
    const requestLocale = readRequestLocale(req)
    const defaultLocale =
      defaultLocaleOption ??
      readConfigDefaultLocale(req) ??
      ''

    if (!requestLocale || !defaultLocale || requestLocale !== defaultLocale) return doc
    if (!req.user) return doc
    if (onlyOnPublished && typed._status && typed._status !== 'published') return doc

    const targetLocales = targetLocalesOption ?? readTargetLocales(req, defaultLocale)
    if (targetLocales.length === 0) return doc

    const resolverKey = options.resolverKey ?? readFirstResolverKey(req)
    if (!resolverKey) {
      req.payload.logger.error({
        msg: `auto-translate: no resolver key available for collection ${collectionSlug} — pass \`resolverKey\` to \`createAutoTranslateCollectionHook\` or configure \`translator.resolvers\` in \`translator({...})\``
      })
      return doc
    }

    const updatedAt = typed.updatedAt ?? new Date().toISOString()

    for (const toLocale of targetLocales) {
      if (toLocale === defaultLocale) continue
      try {
        const job = await req.payload.jobs.queue({
          workflow: workflowSlug,
          input: {
            id: typed.id,
            updatedAt,
            collection: collectionSlug,
            fromLocale: defaultLocale,
            resolver: resolverKey || undefined,
            toLocale
          }
        })
        req.payload.logger.info({
          msg: `auto-translate: queued translation of ${collectionSlug}#${typed.id} → ${toLocale} (job ${job.id})`
        })
      } catch (error) {
        // One failing queue call must NOT break the save — the doc is
        // already persisted; missing translations will be picked up
        // by the next save or a manual retranslate.
        req.payload.logger.error({
          msg: `auto-translate: failed to queue ${collectionSlug}#${typed.id} → ${toLocale}: ${String(error)}`
        })
      }
    }

    return doc
  }

  return { afterChange }
}

// -------- shared helpers --------

function shouldSkipAutoTranslate(context: Record<string, unknown> | undefined): boolean {
  return Boolean((context as { disableAutoTranslate?: unknown } | undefined)?.disableAutoTranslate)
}

function readRequestLocale(req: unknown): string {
  if (!req || typeof req !== 'object') return ''
  const locale = (req as { locale?: unknown }).locale
  return typeof locale === 'string' && locale.length > 0 ? locale : ''
}

function readConfigDefaultLocale(req: unknown): string {
  if (!req || typeof req !== 'object') return ''
  const config = (req as { payload?: { config?: { localization?: { defaultLocale?: unknown } } } })
    .payload?.config
  const def = config?.localization?.defaultLocale
  return typeof def === 'string' && def.length > 0 ? def : ''
}

function readTargetLocales(req: unknown, defaultLocale: string): string[] {
  if (!req || typeof req !== 'object') return []
  const list = (req as { payload?: { config?: { localization?: { locales?: unknown } } } })
    .payload?.config?.localization?.locales
  if (!Array.isArray(list) || list.length === 0) return []
  const out: string[] = []
  for (const entry of list) {
    const code = typeof entry === 'string' ? entry : (entry as { code?: unknown })?.code
    if (typeof code === 'string' && code.length > 0 && code !== defaultLocale) {
      out.push(code)
    }
  }
  return out
}

function readFirstResolverKey(req: unknown): string {
  if (!req || typeof req !== 'object') return ''
  const custom = (req as { payload?: { config?: { custom?: { translator?: { resolvers?: unknown } } } } })
    .payload?.config?.custom?.translator?.resolvers
  if (!Array.isArray(custom) || custom.length === 0) return ''
  const first = custom[0] as { key?: unknown }
  return typeof first?.key === 'string' ? first.key : ''
}
