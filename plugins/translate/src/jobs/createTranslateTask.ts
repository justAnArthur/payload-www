import type { TaskConfig, TaskHandler } from 'payload'

import { findEntityWithConfig } from '../translate/findEntityWithConfig'
import { translateOperation } from '../translate/operation'
import { updateEntity } from '../translate/updateEntity'
import { recordTranslationStatus } from '../review/recordTranslationStatus'







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
      { name: 'resolver', type: 'text', required: false },
      { name: 'mode', type: 'text', required: false }
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
          mode?: 'all' | 'missing'
        }
        job: { id: string }
        req: import('payload').PayloadRequest
      }
      const { id, collection, global, fromLocale, toLocale, resolver: inputResolver } = input
      const mode = input.mode ?? readAutoTranslateMode(req)

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
          emptyOnly: mode !== 'all',
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

      // an edit that landed while the resolver ran queued its own job; this snapshot is stale
      const latest = await findEntityWithConfig({
        collectionSlug: collection,
        globalSlug: global,
        id,
        locale: fromLocale,
        overrideAccess: true,
        req
      })

      if (String(latest.doc?.updatedAt) !== String(result.dataFrom?.updatedAt)) {
        req.payload.logger.warn({
          jobId: job.id,
          msg: `[translate] ${entityLabel}#${id ?? global} changed during translation — skipping ${toLocale}, the newer save re-queues it`
        })
        return { output: { success: true } }
      }

      const translated = result.translatedData ?? {}
      const { _locale: _dropLocale, _parent_id: _dropParent, updatedAt: _dropUpdatedAt, createdAt: _dropCreatedAt, ...data } = translated

      req.payload.logger.info({
        jobId: job.id,
        msg: `[translate] persisting ${entityLabel}#${id ?? global} → ${toLocale}`
      })

      try {
        await updateEntity({
          collectionSlug: collection,
          data,
          depth: 0,
          globalSlug: global,
          id,
          locale: toLocale,
          overrideAccess: true,
          req
        })

        await recordTranslationStatus({
          req,
          collectionSlug: collection,
          globalSlug: global,
          id,
          locale: toLocale,
          config: latest.config,
          dataFrom: latest.doc
        })
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

function readAutoTranslateMode(req: import('payload').PayloadRequest): 'all' | 'missing' {
  return req.payload.config.custom?.translator?.autoTranslateMode === 'all' ? 'all' : 'missing'
}
