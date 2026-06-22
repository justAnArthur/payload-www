import type { CollectionSlug, GlobalSlug, TaskConfig, TaskHandler } from 'payload'

import { translateOperation } from '../translate/operation'

// `TaskConfig.handler` is `string | TaskHandler` (Payload supports
// string-path lazy loading). The factory only ever produces the
// callable form, so we narrow to that — keeps `task.handler(...)`
// callable without an `as any` cast at the test/caller site, and
// stays structurally assignable to `TaskConfig` for
// `jobs: { tasks: [...] }`.
export type TranslateTaskConfig = Omit<TaskConfig, 'handler'> & {
  handler: TaskHandler<string, string>
}

export type CreateTranslateTaskOptions = {
  /**
   * Resolver key the upstream `translateOperation` should call.
   * Must match a `key` declared in the host's
   * `translator({ resolvers: [{ key: '<X>', resolve: ... }] })`.
   * Falls back to the first registered resolver's key when omitted.
   */
  resolverKey?: string
  /**
   * Override the task slug. Default:
   * `'translateEntityToLocale'`.
   */
  slug?: string
}

/**
 * Build the per-locale translation task.
 *
 * Behaviour:
 *
 * 1. Call `translateOperation` with
 *    `emptyOnly: false, overrideAccess: true, update: false` so we
 *    get a translated payload without the plugin writing back.
 * 2. Strip the synthetic `_locale` / `_parent_id` keys the plugin
 *    attaches to the result.
 * 3. Persist via `req.payload.update` (collection) or
 *    `req.payload.updateGlobal` (global) at `toLocale`, again with
 *    `overrideAccess: true` so jobs run cleanly outside user
 *    sessions.
 * 4. Fail loudly on any error — Payload retries the task up to
 *    `retries` times before giving up.
 *
 * Hosts wire the returned task into
 * `payload.config.ts → jobs: { tasks: [<task>] }`.
 */
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
        msg: `persisting ${entityLabel} (id=${id ?? global}) at locale ${toLocale}`
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
