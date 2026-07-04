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
      { name: 'toLocale', type: 'text', required: true },
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
            toLocale: string
            resolver?: string
          }
        }
        req: import('payload').PayloadRequest
        tasks: Record<string, (taskSlug: string, opts: { input: unknown }) => Promise<unknown>>
      }
      const { id, collection, global, fromLocale, toLocale, updatedAt, resolver } = job.input

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

      req.payload.logger.info({
        jobId: job.id,
        msg: `scheduling translation of ${entityKey} → ${toLocale}`
      })

      await tasks[taskSlug](`${entityKey}-${fromLocale}-${toLocale}-${updatedAtIso}`, {
        input: {
          id,
          collection,
          global,
          fromLocale,
          toLocale,
          resolver
        }
      })
    }
  }
}
