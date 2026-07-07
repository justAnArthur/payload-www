import type { CollectionSlug, GlobalSlug, TaskConfig, TaskHandler } from 'payload'

import { translateOperation } from '../translate/operation'







export type TranslateTaskConfig = Omit<TaskConfig, 'handler'> & {
  handler: TaskHandler<string, string>
}

export type CreateTranslateTaskOptions = {
  
  resolverKey?: string
  
  slug?: string
}


export function createTranslateTask(options: CreateTranslateTaskOptions = {}): TranslateTaskConfig {
  const { slug = 'translateEntityToLocale' } = options

  return {
    slug,
    inputSchema: [
      { name: 'id', type: 'number', required: false },
      { name: 'collection', type: 'text', required: false },
      { name: 'global', type: 'text', required: false },
      { name: 'fromLocale', type: 'text', required: true },
      { name: 'toLocale', type: 'text', required: true },
      { name: 'resolver', type: 'text', required: false }
    ],
    outputSchema: [],
    retries: 3,
    handler: async (args) => {
      const { input, job, req } = args as unknown as {
        input: {
          id?: number | string
          collection?: string
          global?: string
          fromLocale: string
          toLocale: string
          resolver?: string
        }
        job: { id: string }
        req: import('payload').PayloadRequest
      }
      const { id, collection, global, fromLocale, toLocale, resolver: inputResolver } = input

      if (!collection && !global) {
        throw new Error('translateTask: either `collection` or `global` must be provided')
      }

      const resolverKey = options.resolverKey ?? inputResolver ?? readFirstResolverKey(req)
      if (!resolverKey) {
        throw new Error(
          `translateTask: no resolver key available — pass \`resolverKey\` to \`createTranslateTask\` or queue the workflow with a \`resolver\` input. Did you forget to pass \`translator.resolvers\` to \`translator({...})\`?`
        )
      }

      const entityLabel = collection || global

      req.payload.logger.info({
        jobId: job.id,
        msg: `translating ${entityLabel} to locale ${toLocale}`
      })

      let result: Awaited<ReturnType<typeof translateOperation>>
      try {
        result = await translateOperation({
          req,
          collectionSlug: collection,
          globalSlug: global,
          emptyOnly: false,
          id,
          locale: toLocale,
          localeFrom: fromLocale,
          overrideAccess: true,
          resolver: resolverKey,
          update: false
        })
      } catch (error) {
        req.payload.logger.error({
          jobId: job.id,
          msg: `translateOperation threw for ${entityLabel} → ${toLocale}: ${String(error)}`
        })
        throw error
      }

      if (!result.success) {
        req.payload.logger.error({
          jobId: job.id,
          msg: `translation for ${entityLabel} to ${toLocale} failed (resolver returned success=false)`
        })
        throw new Error(`translateTask: resolver returned success=false for ${entityLabel} → ${toLocale}`)
      }

      const translated = result.translatedData ?? {}
      const { _locale: _dropLocale, _parent_id: _dropParent, ...data } = translated

      req.payload.logger.info({
        jobId: job.id,
        msg: `[translate] persisting ${entityLabel}#${id ?? global} → ${toLocale}`
      })

      try {
        if (collection) {
          await req.payload.update({
            collection: collection as CollectionSlug,
            data,
            id: id as number | string,
            locale: toLocale,
            overrideAccess: true,
            req
          })
        } else {
          await req.payload.updateGlobal({
            slug: global as GlobalSlug,
            data,
            locale: toLocale,
            overrideAccess: true,
            req
          })
        }
      } catch (error) {
        req.payload.logger.error({
          jobId: job.id,
          msg: `persist failed for ${entityLabel} (id=${id ?? global}) at locale ${toLocale}: ${String(error)}`
        })
        throw error
      }

      req.payload.logger.info({
        jobId: job.id,
        msg: `translation complete for ${entityLabel} → ${toLocale}`
      })

      return { output: { success: true } }
    }
  }
}

function readFirstResolverKey(req: unknown): string {
  if (!req || typeof req !== 'object') return ''
  const custom = (req as { payload?: { config?: { custom?: { translator?: { resolvers?: unknown } } } } })
    .payload?.config?.custom?.translator?.resolvers
  if (!Array.isArray(custom) || custom.length === 0) return ''
  const first = custom[0] as { key?: unknown }
  return typeof first?.key === 'string' ? first.key : ''
}
