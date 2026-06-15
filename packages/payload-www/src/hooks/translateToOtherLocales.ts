import type { CollectionAfterChangeHook, GlobalAfterChangeHook } from 'payload'

export type TranslateToOtherLocalesOptions = {
  defaultLocale: string
  locales: readonly string[]
  collection?: string
  global?: string
  onlyWhenPublished?: boolean
}

const isPublished = (doc: { _status?: string }) => doc._status === 'published'

/**
 * Hook that, when fired on the default locale by an authenticated user,
 * queues a `translateEntityToLocales` workflow job for each non-default
 * locale. Hosts wire their own translator (translator plugin, custom
 * workflow, etc.) — the lib only provides the job-queueing glue.
 */
export function createTranslateToOtherLocalesHook(
  options: TranslateToOtherLocalesOptions,
): CollectionAfterChangeHook | GlobalAfterChangeHook {
  const targets = options.locales.filter((l) => l !== options.defaultLocale)
  const onlyPublished = options.onlyWhenPublished ?? Boolean(options.collection)

  return (async (args: any) => {
    const {
      doc,
      req: { payload, locale, user },
    } = args
    if (!locale || locale !== options.defaultLocale) return
    if (!user) return
    if (onlyPublished && options.collection && !isPublished(doc)) return

    for (const toLocale of targets) {
      const job = await payload.jobs.queue({
        workflow: 'translateEntityToLocales',
        input: {
          ...(options.collection ? { collection: options.collection, id: doc.id } : {}),
          ...(options.global ? { global: options.global } : {}),
          updatedAt: doc.updatedAt,
          fromLocale: locale,
          toLocale,
        },
      })
      payload.logger.info(`pushed translation job ${job.id} -> ${toLocale}`)
    }
  }) as CollectionAfterChangeHook | GlobalAfterChangeHook
}
