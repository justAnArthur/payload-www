import type { CollectionSlug, Config, Field, Plugin, TabsField } from 'payload'
import { deepMergeSimple } from 'payload/shared'

import { runAutoGenerate } from './autoGenerate'
import { MetaField } from './fields/MetaField'
import {
  createMetadataGlobal,
  METADATA_GLOBAL_DEFAULT_SLUG
} from './globals/createMetadataGlobal'
import { openaiMessage } from './openai/message'
import { translations } from './translations'
import type { GenerateSEO, SEOMeta, SEOPluginConfig } from './types'


export type { AutoGenerateConfig, DeriveFrom, FieldsOverride, GenerateSEO, SEOMeta, SEOPluginConfig } from './types'

type GenerateRequest = {
  collectionSlug?: string
  doc?: Record<string, unknown>
  globalSlug?: string
  source?: 'fn' | 'ai'
} & Record<string, unknown>


const buildAutoGenerateHook =
  (pluginConfig: SEOPluginConfig, hostConfig: Config) =>
    async (args: {
      collection?: { slug: string }
      data: Record<string, unknown>
      global?: { slug: string }
      operation: 'create' | 'update'
      originalDoc?: Record<string, unknown>
      req: import('payload').PayloadRequest
    }): Promise<Record<string, unknown>> => {
      const collectionConfig = args.collection
        ? hostConfig.collections?.find((c) => c.slug === args.collection?.slug)
        : undefined
      const globalConfig = args.global
        ? hostConfig.globals?.find((g) => g.slug === args.global?.slug)
        : undefined
      return runAutoGenerate({
        pluginConfig,
        collectionConfig,
        globalConfig,
        data: args.data,
        operation: args.operation,
        locale: typeof args.req.locale === 'string' ? args.req.locale : undefined,
        req: args.req
      })
    }


export const seoPlugin =
  (pluginConfig: SEOPluginConfig = {}): Plugin =>
    (config: Config): Config => {
      const userGenerateSEO = typeof pluginConfig?.generateSEO === 'function' ? pluginConfig.generateSEO : undefined
      const userOpenaiApiKey = typeof pluginConfig?.openaiApiKey === 'string' ? pluginConfig.openaiApiKey : undefined
      const resolvedOpenaiApiKey = userOpenaiApiKey ?? (typeof process !== 'undefined' ? process.env?.OPENAI_API_KEY : undefined)

      const hasGenerateAi = typeof resolvedOpenaiApiKey === 'string'
      const hasGenerateFn = typeof userGenerateSEO === 'function'

      const buildMetaField = (): Field => {
        return MetaField({
          hasGenerateAi,
          hasGenerateFn,
          relationTo: pluginConfig.uploadsCollection,
          interfaceName: pluginConfig.interfaceName,
          localized: true
        }) as unknown as Field
      }

      const seoFields: Field[] =
        pluginConfig?.fields && typeof pluginConfig.fields === 'function'
          ? pluginConfig.fields({ defaultFields: [buildMetaField()] })
          : [buildMetaField()]

      const hookConfig: SEOPluginConfig = {
        ...pluginConfig,
        openaiApiKey: resolvedOpenaiApiKey
      }
      const autoGenerateHook = buildAutoGenerateHook(hookConfig, config)

      const withAutoGenerateHook = <T extends { hooks?: { beforeChange?: unknown } }>(item: T): T => {
        const existing = item.hooks?.beforeChange
        const composed = async (args: unknown): Promise<unknown> => {
          const a = args as {
            collection?: { slug: string }
            data: Record<string, unknown>
            global?: { slug: string }
            operation: 'create' | 'update'
            originalDoc?: Record<string, unknown>
            req: import('payload').PayloadRequest
          }
          const data = await autoGenerateHook(a)
          if (typeof existing === 'function') {
            return (existing as (a: unknown) => Promise<unknown>)({ ...a, data })
          }
          return data
        }
        return { ...item, hooks: { ...(item.hooks ?? {}), beforeChange: [composed] } }
      }

      const hostHasMetadataGlobal = (config.globals ?? []).some(
        (g) => g.slug === METADATA_GLOBAL_DEFAULT_SLUG
      )

      return {
        ...config,
        collections:
          config.collections?.map((collection) => {
            const { slug } = collection

            const isEnabled = pluginConfig?.collections?.includes(slug as CollectionSlug)

            if (!isEnabled) return collection

            if (pluginConfig?.tabbedUI) {


              const emailField =
                (collection.auth ||
                  !(
                    typeof collection.auth === 'object' &&
                    (collection.auth as { disableLocalStrategy?: boolean })
                      .disableLocalStrategy
                  )) &&
                collection.fields?.find(
                  (field) => 'name' in field && field.name === 'email'
                )

              const hasOnlyEmailField = collection.fields?.length === 1 && emailField

              if (hasOnlyEmailField) {
                return withAutoGenerateHook({
                  ...collection,
                  fields: [
                    ...(emailField ? [emailField] : []),
                    {
                      tabs: [{ fields: seoFields, label: 'SEO' }],
                      type: 'tabs'
                    } as TabsField
                  ]
                })
              }

              const existingTabsIndex = collection.fields?.findIndex(
                (field) => field.type === 'tabs'
              )
              const existingTabsField =
                existingTabsIndex !== -1 ? collection.fields[existingTabsIndex] : null

              if (existingTabsField && existingTabsField.type === 'tabs') {
                const updatedTabsField: TabsField = {
                  ...existingTabsField,
                  tabs: [...existingTabsField.tabs, { fields: seoFields, label: 'SEO' }]
                }
                return withAutoGenerateHook({
                  ...collection,
                  fields: [
                    ...collection.fields.slice(0, existingTabsIndex),
                    updatedTabsField,
                    ...collection.fields.slice(existingTabsIndex + 1)
                  ]
                })
              }

              const nonEmailFields = emailField
                ? collection.fields.filter(
                  (field) => 'name' in field && field.name !== 'email'
                )
                : collection.fields

              return withAutoGenerateHook({
                ...collection,
                fields: [
                  ...(emailField ? [emailField] : []),
                  {
                    tabs: [
                      {
                        fields: nonEmailFields,
                        label: collection?.labels?.singular || 'Content'
                      },
                      { fields: seoFields, label: 'SEO' }
                    ],
                    type: 'tabs'
                  } as TabsField
                ]
              })
            }

            return withAutoGenerateHook({
              ...collection,
              fields: [...(collection?.fields || []), ...seoFields]
            })
          }) || [],
        endpoints: [
          ...(config.endpoints ?? []),
          {
            handler: async (req): Promise<Response> => {
              const data = ((await req.json?.()) ?? {}) as GenerateRequest
              if (data?.doc) {
                ;(req as { data?: unknown }).data = data.doc
              }


              const collectionConfig = data.collectionSlug
                ? config.collections?.find((c) => c.slug === data.collectionSlug)
                : undefined
              const globalConfig = data.globalSlug
                ? config.globals?.find((g) => g.slug === data.globalSlug)
                : undefined

              const baseArgs: Parameters<GenerateSEO>[0] = {
                collectionConfig,
                doc: data.doc ?? {},
                globalConfig,
                hasPublishedDoc: data.hasPublishedDoc as never,
                locale: typeof data.locale === 'string' ? data.locale : undefined,
                req,
                title: data.title as never,
                versionCount: data.versionCount as never
              }

              let meta: Partial<SEOMeta> = {}

              if (data.source === 'fn' && userGenerateSEO) {
                meta = await userGenerateSEO({
                  ...baseArgs,
                  collectionSlug: data.collectionSlug as never,
                  docPermissions: data.docPermissions as never,
                  globalSlug: data.globalSlug as never,
                  hasPublishPermission: data.hasPublishPermission as never,
                  hasPublishedDoc: data.hasPublishedDoc as never,
                  hasSavePermission: data.hasSavePermission as never,
                  id: data.id as never,
                  initialData: data.initialData as never,
                  initialState: data.initialState as never,
                  preferencesKey: data.preferencesKey as never,
                  title: data.title as never,
                  versionCount: data.versionCount as never
                } as Parameters<GenerateSEO>[0])
              } else if (hasGenerateAi) {
                meta = await openaiMessage({
                  apiKey: resolvedOpenaiApiKey as string,
                  content: JSON.stringify(data.doc ?? {}),
                  req
                })
              }

              return Response.json({ meta }, { status: 200 })
            },
            method: 'post',
            path: '/plugin-seo/generate'
          }
        ],
        globals: [
          ...(config.globals?.map((global) => {
            const { slug } = global

            const isEnabled = pluginConfig?.globals?.includes(slug as never)

            if (!isEnabled) return global

            if (pluginConfig?.tabbedUI) {
              const existingTabsIndex = global.fields?.findIndex(
                (field) => field.type === 'tabs'
              )
              const existingTabsField =
                existingTabsIndex !== -1 ? global.fields[existingTabsIndex] : null

              if (existingTabsField && existingTabsField.type === 'tabs') {
                const updatedTabsField: TabsField = {
                  ...existingTabsField,
                  tabs: [...existingTabsField.tabs, { fields: seoFields, label: 'SEO' }]
                }
                return withAutoGenerateHook({
                  ...global,
                  fields: [
                    ...global.fields.slice(0, existingTabsIndex),
                    updatedTabsField,
                    ...global.fields.slice(existingTabsIndex + 1)
                  ]
                })
              }

              return withAutoGenerateHook({
                ...global,
                fields: [
                  {
                    tabs: [
                      {
                        fields: [...(global?.fields || [])],
                        label: global?.label || 'Content'
                      },
                      { fields: seoFields, label: 'SEO' }
                    ],
                    type: 'tabs'
                  } as TabsField
                ]
              })
            }

            return withAutoGenerateHook({
              ...global,
              fields: [...(global?.fields || []), ...seoFields]
            })
          }) || []),
          ...(hostHasMetadataGlobal ? [] : [createMetadataGlobal()])
        ],
        i18n: {
          ...config.i18n,
          translations: config.i18n?.translations
            ? deepMergeSimple(translations, config.i18n.translations)
            : translations
        }
      }
    }
