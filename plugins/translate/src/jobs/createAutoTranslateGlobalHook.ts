import type { GlobalAfterChangeHook } from 'payload'

import { TRANSLATE_WORKFLOW_SLUG } from './constants'

type AnyDoc = { id?: number | string; updatedAt?: string | Date }

export type CreateAutoTranslateGlobalHookOptions = {
  /**
   * The global's slug. Used to populate the workflow's `global`
   * input so the queued task targets the right entity.
   */
  globalSlug: string
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
 * Build a `GlobalAfterChangeHook` that schedules the
 * auto-translation workflow for every non-default locale.
 *
 * Same skip rules as the collection hook factory **minus** the
 * `_status === 'published'` check (globals have no versioning —
 * every save is the canonical state). See
 * `createAutoTranslateCollectionHook` for the full rule list.
 */
export function createAutoTranslateGlobalHook(
  options: CreateAutoTranslateGlobalHookOptions
): GlobalAfterChangeHook {
  const {
    globalSlug,
    defaultLocale: defaultLocaleOption,
    targetLocales: targetLocalesOption,
    workflowSlug = TRANSLATE_WORKFLOW_SLUG
  } = options

  return async ({ doc, req }) => {
    if (shouldSkipAutoTranslate(req.context)) return doc

    const typed = doc as AnyDoc
    const requestLocale = readRequestLocale(req)
    const defaultLocale = defaultLocaleOption ?? readConfigDefaultLocale(req) ?? ''

    if (!requestLocale || !defaultLocale || requestLocale !== defaultLocale) return doc
    if (!req.user) return doc

    const targetLocales = targetLocalesOption ?? readTargetLocales(req, defaultLocale)
    if (targetLocales.length === 0) return doc

    const resolverKey = options.resolverKey ?? readFirstResolverKey(req)
    if (!resolverKey) {
      req.payload.logger.error({
        msg: `auto-translate: no resolver key available for global ${globalSlug} — pass \`resolverKey\` to \`createAutoTranslateGlobalHook\` or configure \`translator.resolvers\` in \`translator({...})\``
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
            updatedAt,
            global: globalSlug,
            fromLocale: defaultLocale,
            resolver: resolverKey || undefined,
            toLocale
          }
        })
        req.payload.logger.info({
          msg: `auto-translate: queued translation of ${globalSlug} → ${toLocale} (job ${job.id})`
        })
      } catch (error) {
        req.payload.logger.error({
          msg: `auto-translate: failed to queue ${globalSlug} → ${toLocale}: ${String(error)}`
        })
      }
    }

    return doc
  }
}

// -------- shared helpers --------
//
// Duplicated from createAutoTranslateCollectionHook rather than
// imported — the helpers are four pure functions and the duplication
// keeps the two hook factories independent (no cross-module
// dependency, easier to tree-shake).

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
