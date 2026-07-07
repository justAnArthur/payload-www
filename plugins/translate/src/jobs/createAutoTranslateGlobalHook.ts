import type { GlobalAfterChangeHook } from 'payload'

import { TRANSLATE_WORKFLOW_SLUG } from './constants'

type AnyDoc = { id?: number | string; updatedAt?: string | Date }

export type CreateAutoTranslateGlobalHookOptions = {
  
  globalSlug: string
  
  defaultLocale?: string
  
  targetLocales?: string[]
  
  workflowSlug?: string
  
  resolverKey?: string
}


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

    const toLocales = targetLocales.filter((toLocale) => toLocale !== defaultLocale)
    if (toLocales.length === 0) return doc

    try {
      // One workflow per global (not one per locale): it translates every target
      // locale sequentially, so the per-locale updates never race on the same doc.
      const job = await req.payload.jobs.queue({
        workflow: workflowSlug,
        input: {
          updatedAt,
          global: globalSlug,
          fromLocale: defaultLocale,
          resolver: resolverKey || undefined,
          toLocales
        }
      })
      req.payload.logger.info({
        msg: `auto-translate: queued translation of ${globalSlug} → [${toLocales.join(', ')}] (job ${job.id})`
      })
    } catch (error) {
      req.payload.logger.error({
        msg: `auto-translate: failed to queue ${globalSlug}: ${String(error)}`
      })
    }

    return doc
  }
}








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
