import type {
  CollectionAfterChangeHook,
  CollectionConfig,
  CollectionSlug,
  Config,
  GlobalAfterChangeHook,
  GlobalConfig,
  GlobalSlug,
  Plugin,
  TaskConfig,
  WorkflowConfig
} from 'payload'
import { deepMerge } from 'payload/shared'

import { CustomButton } from './client/components/CustomButton'
import { translations } from './i18n-translations'
import { createAutoTranslateCollectionHook } from './jobs/createAutoTranslateCollectionHook'
import { createAutoTranslateGlobalHook } from './jobs/createAutoTranslateGlobalHook'
import { createTranslateTask } from './jobs/createTranslateTask'
import { createTranslateWorkflow } from './jobs/createTranslateWorkflow'
import { translateEndpoint } from './translate/endpoint'
import { translateOperation } from './translate/operation'
import type { TranslatorConfig } from './types'

export { copyResolver } from './resolvers/copy'

export { googleResolver } from './resolvers/google'

export { libreResolver } from './resolvers/libreTranslate'

export { openAIResolver } from './resolvers/openAI'
export * from './resolvers/types'

export { translateOperation }



export const AUTO_TRANSLATE_MARKER = Symbol.for(
  '@justanarthur/payload-plugin-translator/auto-translate'
)

type MarkedHook = { [AUTO_TRANSLATE_MARKER]?: true }

export const translator: (pluginConfig: TranslatorConfig) => Plugin = (pluginConfig) => {
  return (config) => {
    if (pluginConfig.disabled || !config.localization || config.localization.locales.length < 2)
      return config

    const autoTranslate = pluginConfig.autoTranslate ?? true

    const updatedConfig: Config = {
      ...config,
      admin: {
        ...(config.admin ?? {}),
        custom: {
          ...(config.admin?.custom ?? {}),
          translator: {
            resolvers: pluginConfig.resolvers.map(({ key }) => ({ key }))
          }
        }
      },
      collections:
        config.collections?.map((collection) => {
          if (!pluginConfig.collections.includes(collection.slug as CollectionSlug))
            return collection

          return {
            ...collection,
            admin: {
              ...(collection.admin ?? {}),
              components: {
                ...(collection.admin?.components ?? {}),
                edit: {
                  ...(collection.admin?.components?.edit ?? {}),
                  PublishButton: CustomButton('publish'),
                  SaveButton: CustomButton('save')
                }
              }
            },
            ...(autoTranslate
              ? {
                  hooks: attachCollectionHook(
                    collection.hooks,
                    createAutoTranslateCollectionHook({ collectionSlug: String(collection.slug) }).afterChange
                  )
                }
              : {})
          }
        }) ?? [],
      custom: {
        ...(config.custom ?? {}),
        translator: {
          ...pluginConfig
        }
      },
      endpoints: [
        ...(config.endpoints ?? []),
        {
          handler: translateEndpoint,
          method: 'post',
          path: '/translator/translate'
        }
      ],
      globals:
        config.globals?.map((global) => {
          if (!pluginConfig.globals.includes(global.slug as GlobalSlug)) return global

          return {
            ...global,
            admin: {
              ...(global.admin ?? {}),
              components: {
                ...(global.admin?.components ?? {}),
                elements: {
                  ...(global.admin?.components?.elements ?? {}),
                  PublishButton: CustomButton('publish'),
                  SaveButton: CustomButton('save')
                }
              }
            },
            ...(autoTranslate
              ? {
                  hooks: attachGlobalHook(
                    global.hooks,
                    createAutoTranslateGlobalHook({ globalSlug: String(global.slug) })
                  )
                }
              : {})
          }
        }) ?? [],
      i18n: {
        ...config.i18n,
        translations: {
          ...deepMerge(config.i18n?.translations ?? {}, translations)
        }
      },
      ...(autoTranslate
        ? {
            jobs: {
              ...(config.jobs ?? {}),
              tasks: ensureJobBySlug<TaskConfig>(config.jobs?.tasks, createTranslateTask()),
              workflows: ensureJobBySlug<WorkflowConfig>(
                config.jobs?.workflows,
                createTranslateWorkflow()
               ),
              deleteJobOnComplete: false,
              jobsCollectionOverrides: ({ defaultJobsCollection }) => {
                defaultJobsCollection.admin = {
                  ...defaultJobsCollection.admin,
                  hidden: false,
                  group: 'System'
                }
                return defaultJobsCollection
              }
            }
          }
        : {})
    }

    return updatedConfig
  }
}



function ensureJobBySlug<T extends { slug: string }>(existing: T[] | undefined, job: T): T[] {
  const list = existing ?? []
  if (list.some((entry) => entry.slug === job.slug)) return list
  return [...list, job]
}








function attachCollectionHook(
  existing: CollectionConfig['hooks'] | undefined,
  hookToAttach: CollectionAfterChangeHook
): NonNullable<CollectionConfig['hooks']> {
  const list = toHookArray(existing?.afterChange)
  if (list.some(isMarkedAutoTranslate)) return existing ?? {}
  return {
    ...(existing ?? {}),
    afterChange: [markAutoTranslate(hookToAttach), ...list]
  }
}

function attachGlobalHook(
  existing: GlobalConfig['hooks'] | undefined,
  hookToAttach: GlobalAfterChangeHook
): NonNullable<GlobalConfig['hooks']> {
  const list = toHookArray(existing?.afterChange)
  if (list.some(isMarkedAutoTranslate)) return existing ?? {}
  return {
    ...(existing ?? {}),
    afterChange: [markAutoTranslate(hookToAttach), ...list]
  }
}

function toHookArray<T>(input: T | T[] | undefined): T[] {
  if (input === undefined) return []
  return Array.isArray(input) ? input : [input]
}

function markAutoTranslate<T extends object>(hook: T): T & MarkedHook {
  ;(hook as MarkedHook)[AUTO_TRANSLATE_MARKER] = true
  return hook as T & MarkedHook
}

function isMarkedAutoTranslate(hook: unknown): boolean {
  return Boolean((hook as MarkedHook | undefined)?.[AUTO_TRANSLATE_MARKER])
}
