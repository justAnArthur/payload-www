import type { WorkflowConfig, WorkflowHandler } from 'payload'



export type TranslateWorkflowConfig = Omit<WorkflowConfig, 'handler'> & {
  handler: WorkflowHandler
}

export type CreateTranslateWorkflowOptions = {

  slug?: string

  taskSlug?: string
}


export function createTranslateWorkflow(
  options: CreateTranslateWorkflowOptions = {}
): TranslateWorkflowConfig {
  const { slug = 'translateEntityToLocales', taskSlug = 'translateEntityToLocale' } = options

  return {
    slug,
    inputSchema: [
      { name: 'id', type: 'number', required: false },
      { name: 'updatedAt', type: 'date', required: true },
      { name: 'collection', type: 'text', required: false },
      { name: 'global', type: 'text', required: false },
      { name: 'fromLocale', type: 'text', required: true },
      // Array of target locales handled by this single per-document workflow.
      { name: 'toLocales', type: 'json', required: false },
      // Kept for backward-compatibility with jobs queued by older versions.
      { name: 'toLocale', type: 'text', required: false },
      { name: 'resolver', type: 'text', required: false }
    ],
    handler: async (args) => {
      const { job, req, tasks } = args as unknown as {
        job: {
          id: string
          input: {
            id?: number | string
            updatedAt: string | Date
            collection?: string
            global?: string
            fromLocale: string
            toLocales?: string[]
            toLocale?: string
            resolver?: string
          }
        }
        req: import('payload').PayloadRequest
        tasks: Record<string, (taskSlug: string, opts: { input: unknown }) => Promise<unknown>>
      }
      const { id, collection, global, fromLocale, toLocales, toLocale, updatedAt, resolver } = job.input

      if (!collection && !global) {
        throw new Error('translateWorkflow: either `collection` or `global` must be provided')
      }

      if (typeof req.payload.config.localization !== 'object') {
        req.payload.logger.error({
          jobId: job.id,
          msg: 'localization is not enabled — skipping auto-translation workflow'
        })
        return
      }

      const entityKey = collection ? `${collection}-${id}` : global
      const updatedAtIso = updatedAt instanceof Date ? updatedAt.toISOString() : String(updatedAt)

      const requested = Array.isArray(toLocales) && toLocales.length > 0
        ? toLocales
        : toLocale
          ? [toLocale]
          : []
      const targets = requested.filter((locale) => typeof locale === 'string' && locale && locale !== fromLocale)

      if (targets.length === 0) {
        req.payload.logger.warn({
          jobId: job.id,
          msg: `translateWorkflow: no target locales for ${entityKey} — nothing to translate`
        })
        return
      }

      req.payload.logger.info({
        jobId: job.id,
        msg: `scheduling translation of ${entityKey}: ${fromLocale} → [${targets.join(', ')}]`
      })

      // Translate one locale at a time. Each task runs its own `payload.update()`
      // on the SAME document; running them concurrently races on the shared
      // (non-localized) block rows and on the versioned "latest" snapshot, which
      // silently drops whole locales. Awaiting sequentially serializes the writes.
      for (const target of targets) {
        await tasks[taskSlug](`${entityKey}-${fromLocale}-${target}-${updatedAtIso}`, {
          input: {
            id,
            collection,
            global,
            fromLocale,
            toLocale: target,
            resolver
          }
        })
      }
    }
  }
}
