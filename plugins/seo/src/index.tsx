import type { CollectionSlug, Config, Field, TabsField } from 'payload'
import { deepMergeSimple } from 'payload/shared'

import { MetaField } from './fields/MetaField'
import { openaiMessage } from './openai/message'
import { translations } from './translations'
import type { GenerateSEO, SEOMeta, SEOPluginConfig } from './types'

// Re-export types from the root entry so consumers don't need the /types subpath.
export type { FieldsOverride, GenerateSEO, SEOMeta, SEOPluginConfig } from './types'

type GenerateRequest = {
  collectionSlug?: string
  doc?: Record<string, unknown>
  globalSlug?: string
  source?: 'fn' | 'ai'
} & Record<string, unknown>

/**
 * Payload SEO plugin.
 *
 * One `meta` group field, one `/plugin-seo/generate` endpoint, one optional
 * `generateSEO` function in your config. Subfields cover the standard SEO
 * meta (title, description, keywords, image) plus Open Graph, Twitter Card,
 * and Advanced (canonical / robots / noindex / author / dates).
 *
 *   seoPlugin({
 *     collections: ['posts', 'pages'],
 *     generateSEO: async ({ doc }) => {
 *       const { title, description } = await callYourLLM(doc)
 *       return { title, description, keywords: deriveKeywords(doc) }
 *     },
 *   })
 */
export const seoPlugin =
  (pluginConfig: SEOPluginConfig = {}) =>
    (config: Config): Config => {
      const hasGenerateFn = typeof pluginConfig?.generateSEO === 'function'
      const hasGenerateAi = typeof pluginConfig?.openaiApiKey === 'string'

      const buildMetaField = (): Field => {
        return MetaField({
          hasGenerateAi,
          hasGenerateFn,
          relationTo: pluginConfig.uploadsCollection,
          interfaceName: pluginConfig.interfaceName
        }) as unknown as Field
      }

      const seoFields: Field[] =
        pluginConfig?.fields && typeof pluginConfig.fields === 'function'
          ? pluginConfig.fields({ defaultFields: [buildMetaField()] })
          : [buildMetaField()]

      return {
        ...config,
        collections:
          config.collections?.map((collection) => {
            const { slug } = collection

            const isEnabled = pluginConfig?.collections?.includes(slug as CollectionSlug)

            if (!isEnabled) return collection

            if (pluginConfig?.tabbedUI) {
              // prevent issues with auth-enabled collections having an email
              // field that shouldn't be moved to the SEO tab
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
                return {
                  ...collection,
                  fields: [
                    ...(emailField ? [emailField] : []),
                    {
                      tabs: [{ fields: seoFields, label: 'SEO' }],
                      type: 'tabs'
                    } as TabsField
                  ]
                }
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
                return {
                  ...collection,
                  fields: [
                    ...collection.fields.slice(0, existingTabsIndex),
                    updatedTabsField,
                    ...collection.fields.slice(existingTabsIndex + 1)
                  ]
                }
              }

              const nonEmailFields = emailField
                ? collection.fields.filter(
                  (field) => 'name' in field && field.name !== 'email'
                )
                : collection.fields

              return {
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
              }
            }

            return {
              ...collection,
              fields: [...(collection?.fields || []), ...seoFields]
            }
          }) || [],
        endpoints: [
          ...(config.endpoints ?? []),
          {
            handler: async (req): Promise<Response> => {
              const data = ((await req.json?.()) ?? {}) as GenerateRequest
              if (data?.doc) {
                ;(req as { data?: unknown }).data = data.doc
              }

              // Build the args the user's generateSEO / OpenAI helper expects.
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

              const source = data.source ?? (hasGenerateFn ? 'fn' : 'ai')

              if (source === 'fn' && hasGenerateFn) {
                meta = await (pluginConfig.generateSEO as GenerateSEO)({
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
              } else if (source === 'ai' && hasGenerateAi) {
                meta = await openaiMessage({
                  apiKey: pluginConfig.openaiApiKey as string,
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
        globals:
          config.globals?.map((global) => {
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
                return {
                  ...global,
                  fields: [
                    ...global.fields.slice(0, existingTabsIndex),
                    updatedTabsField,
                    ...global.fields.slice(existingTabsIndex + 1)
                  ]
                }
              }

              return {
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
              }
            }

            return {
              ...global,
              fields: [...(global?.fields || []), ...seoFields]
            }
          }) || [],
        i18n: {
          ...config.i18n,
          translations: config.i18n?.translations
            ? deepMergeSimple(translations, config.i18n.translations)
            : translations
        }
      }
    }
