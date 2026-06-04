import type { CollectionSlug, Config, Field, GlobalSlug, GroupField, TabsField } from 'payload'
import { deepMergeSimple } from 'payload/shared'

import { MetaDescriptionField } from './fields/MetaDescription'
import { MetaImageField } from './fields/MetaImage'
import { MetaTitleField } from './fields/MetaTitle'
import { OverviewField } from './fields/Overview'
import { PreviewField } from './fields/Preview'
import { openaiMessage } from './openai/message'
import { translations } from './translations'
import type {
  GenerateDescription,
  GenerateImage,
  GenerateTitle,
  GenerateURL,
  SEOPluginConfig,
} from './types'

export const seoPlugin =
  (pluginConfig: SEOPluginConfig) =>
  (config: Config): Config => {
    const defaultFields: Field[] = [
      OverviewField({}),
      MetaTitleField({
        hasGenerateAi: typeof pluginConfig?.generateTitleAi === 'function',
        hasGenerateFn: typeof pluginConfig?.generateTitle === 'function',
      }),
      MetaDescriptionField({
        hasGenerateAi: typeof pluginConfig?.generateDescriptionAi === 'function',
        hasGenerateFn: typeof pluginConfig?.generateDescription === 'function',
      }),
      ...(pluginConfig?.uploadsCollection
        ? [
            MetaImageField({
              hasGenerateFn: typeof pluginConfig?.generateImage === 'function',
              relationTo: pluginConfig.uploadsCollection,
            }),
          ]
        : []),
      PreviewField({
        hasGenerateFn: typeof pluginConfig?.generateURL === 'function',
      }),
    ]

    const seoFields: GroupField[] = [
      {
        fields: [
          ...(pluginConfig?.fields && typeof pluginConfig.fields === 'function'
            ? pluginConfig.fields({ defaultFields })
            : defaultFields),
        ],
        interfaceName: pluginConfig.interfaceName,
        label: 'SEO',
        name: 'meta',
        type: 'group',
      },
    ]

    return {
      ...config,
      collections:
        config.collections?.map((collection) => {
          const { slug } = collection

          const isEnabled = pluginConfig?.collections?.includes(slug as CollectionSlug)

          if (isEnabled) {
            if (pluginConfig?.tabbedUI) {
              // prevent issues with auth enabled collections having an email field that shouldn't be moved to the SEO tab
              const emailField =
                (collection.auth ||
                  !(
                    typeof collection.auth === 'object' &&
                    (collection.auth as any).disableLocalStrategy
                  )) &&
                collection.fields?.find((field) => 'name' in field && field.name === 'email')

              const hasOnlyEmailField = collection.fields?.length === 1 && emailField

              if (hasOnlyEmailField) {
                return {
                  ...collection,
                  fields: [
                    ...(emailField ? [emailField] : []),
                    {
                      tabs: [{ fields: seoFields, label: 'SEO' }],
                      type: 'tabs',
                    } as TabsField,
                  ],
                }
              }

              // Find an existing tabs field anywhere in the fields array
              const existingTabsIndex = collection.fields?.findIndex(
                (field) => field.type === 'tabs',
              )
              const existingTabsField =
                existingTabsIndex !== -1 ? collection.fields[existingTabsIndex] : null

              if (existingTabsField && existingTabsField.type === 'tabs') {
                // Inject SEO tab into the existing tabs field
                const updatedTabsField: TabsField = {
                  ...existingTabsField,
                  tabs: [...existingTabsField.tabs, { fields: seoFields, label: 'SEO' }],
                }
                return {
                  ...collection,
                  fields: [
                    ...collection.fields.slice(0, existingTabsIndex),
                    updatedTabsField,
                    ...collection.fields.slice(existingTabsIndex + 1),
                  ],
                }
              }

              // No existing tabs field — wrap all fields in a Content tab and add SEO tab
              const nonEmailFields = emailField
                ? collection.fields.filter((field) => 'name' in field && field.name !== 'email')
                : collection.fields

              return {
                ...collection,
                fields: [
                  ...(emailField ? [emailField] : []),
                  {
                    tabs: [
                      {
                        fields: nonEmailFields,
                        label: collection?.labels?.singular || 'Content',
                      },
                      { fields: seoFields, label: 'SEO' },
                    ],
                    type: 'tabs',
                  } as TabsField,
                ],
              }
            }

            return {
              ...collection,
              fields: [...(collection?.fields || []), ...seoFields],
            }
          }

          return collection
        }) || [],
      endpoints: [
        ...(config.endpoints ?? []),
        {
          handler: async (req) => {
            const data: Omit<
              Parameters<GenerateTitle>[0],
              'collectionConfig' | 'globalConfig' | 'req'
            > = await req.json?.()

            if (data) {
              req.data = data
            }

            const result = pluginConfig.generateTitle
              ? await pluginConfig.generateTitle({
                  ...data,
                  collectionConfig: req.data?.collectionSlug
                    ? config.collections?.find((c) => c.slug === req.data?.collectionSlug)
                    : undefined,
                  globalConfig: req.data?.globalSlug
                    ? config.globals?.find((g) => g.slug === req.data?.globalSlug)
                    : undefined,
                  req,
                } satisfies Parameters<GenerateTitle>[0])
              : ''

            return new Response(JSON.stringify({ result }), { status: 200 })
          },
          method: 'post',
          path: '/plugin-seo/generate-title',
        },
        {
          handler: async (req) => {
            if (!pluginConfig.openaiApiKey)
              return new Response(JSON.stringify({ message: 'Something went wrong' }), {
                status: 500,
              })

            const data: Omit<
              Parameters<GenerateTitle>[0],
              'collectionConfig' | 'globalConfig' | 'req'
            > = await req.json?.()

            if (data) {
              req.data = data
            }

            const content = pluginConfig.generateTitleAi
              ? await pluginConfig.generateTitleAi({
                  ...data,
                  collectionConfig: req.data?.collectionSlug
                    ? config.collections?.find((c) => c.slug === req.data?.collectionSlug)
                    : undefined,
                  globalConfig: req.data?.globalSlug
                    ? config.globals?.find((g) => g.slug === req.data?.globalSlug)
                    : undefined,
                  req,
                })
              : ''

            console.log('[handler "/plugin-seo/generate-title-ai"]', { content })

            const aiResult = await openaiMessage({
              apiKey: pluginConfig.openaiApiKey,
              content,
              req,
            })

            console.log('[handler "/plugin-seo/generate-title-ai"]', { aiResult })

            return Response.json({ result: aiResult }, { status: 200 })
          },
          method: 'post',
          path: '/plugin-seo/generate-title-ai',
        },
        {
          handler: async (req) => {
            const data: Omit<
              Parameters<GenerateTitle>[0],
              'collectionConfig' | 'globalConfig' | 'req'
            > = await req.json?.()

            if (data) {
              req.data = data
            }

            const result = pluginConfig.generateDescription
              ? await pluginConfig.generateDescription({
                  ...data,
                  collectionConfig: req.data?.collectionSlug
                    ? config.collections?.find((c) => c.slug === req.data?.collectionSlug)
                    : undefined,
                  globalConfig: req.data?.globalSlug
                    ? config.globals?.find((g) => g.slug === req.data?.globalSlug)
                    : undefined,
                  req,
                } satisfies Parameters<GenerateDescription>[0])
              : ''

            return new Response(JSON.stringify({ result }), { status: 200 })
          },
          method: 'post',
          path: '/plugin-seo/generate-description',
        },
        {
          handler: async (req) => {
            if (!pluginConfig.openaiApiKey)
              return new Response(JSON.stringify({ message: 'Something went wrong' }), {
                status: 500,
              })

            const data: Omit<
              Parameters<GenerateTitle>[0],
              'collectionConfig' | 'globalConfig' | 'req'
            > = await req.json?.()

            if (data) {
              req.data = data
            }
            const content = pluginConfig.generateDescriptionAi
              ? await pluginConfig.generateDescriptionAi({
                  ...data,
                  collectionConfig: req.data?.collectionSlug
                    ? config.collections?.find((c) => c.slug === req.data?.collectionSlug)
                    : undefined,
                  globalConfig: req.data?.globalSlug
                    ? config.globals?.find((g) => g.slug === req.data?.globalSlug)
                    : undefined,
                  req,
                })
              : ''

            const aiResult = await openaiMessage({
              apiKey: pluginConfig.openaiApiKey,
              content,
              req,
            })

            return Response.json({ result: aiResult }, { status: 200 })
          },
          method: 'post',
          path: '/plugin-seo/generate-description-ai',
        },
        {
          handler: async (req) => {
            const data: Omit<
              Parameters<GenerateTitle>[0],
              'collectionConfig' | 'globalConfig' | 'req'
            > = await req.json?.()

            if (data) {
              req.data = data
            }

            const result = pluginConfig.generateURL
              ? await pluginConfig.generateURL({
                  ...data,
                  collectionConfig: req.data?.collectionSlug
                    ? config.collections?.find((c) => c.slug === req.data?.collectionSlug)
                    : undefined,
                  globalConfig: req.data?.globalSlug
                    ? config.globals?.find((g) => g.slug === req.data?.globalSlug)
                    : undefined,
                  req,
                } satisfies Parameters<GenerateURL>[0])
              : ''

            return new Response(JSON.stringify({ result }), { status: 200 })
          },
          method: 'post',
          path: '/plugin-seo/generate-url',
        },
        {
          handler: async (req) => {
            const data: Omit<
              Parameters<GenerateTitle>[0],
              'collectionConfig' | 'globalConfig' | 'req'
            > = await req.json?.()

            if (data) {
              req.data = data
            }

            const result = pluginConfig.generateImage
              ? await pluginConfig.generateImage({
                  ...data,
                  collectionConfig: req.data?.collectionSlug
                    ? config.collections?.find((c) => c.slug === req.data?.collectionSlug)
                    : null,
                  globalConfig: req.data?.globalSlug
                    ? config.globals?.find((g) => g.slug === req.data?.globalSlug)
                    : null,
                  req,
                } as Parameters<GenerateImage>[0])
              : ''

            return new Response(result, { status: 200 })
          },
          method: 'post',
          path: '/plugin-seo/generate-image',
        },
      ],
      globals:
        config.globals?.map((global) => {
          const { slug } = global

          const isEnabled = pluginConfig?.globals?.includes(slug as GlobalSlug)

          if (isEnabled) {
            if (pluginConfig?.tabbedUI) {
              // Find an existing tabs field anywhere in the globals fields array
              const existingTabsIndex = global.fields?.findIndex((field) => field.type === 'tabs')
              const existingTabsField =
                existingTabsIndex !== -1 ? global.fields[existingTabsIndex] : null

              if (existingTabsField && existingTabsField.type === 'tabs') {
                // Inject SEO tab into the existing tabs field
                const updatedTabsField: TabsField = {
                  ...existingTabsField,
                  tabs: [...existingTabsField.tabs, { fields: seoFields, label: 'SEO' }],
                }
                return {
                  ...global,
                  fields: [
                    ...global.fields.slice(0, existingTabsIndex),
                    updatedTabsField,
                    ...global.fields.slice(existingTabsIndex + 1),
                  ],
                }
              }

              // No existing tabs field — wrap all fields in a Content tab and add SEO tab
              return {
                ...global,
                fields: [
                  {
                    tabs: [
                      {
                        fields: [...(global?.fields || [])],
                        label: global?.label || 'Content',
                      },
                      { fields: seoFields, label: 'SEO' },
                    ],
                    type: 'tabs',
                  } as TabsField,
                ],
              }
            }

            return {
              ...global,
              fields: [...(global?.fields || []), ...seoFields],
            }
          }

          return global
        }) || [],
      i18n: {
        ...config.i18n,
        translations: config.i18n?.translations
          ? deepMergeSimple(translations, config.i18n.translations)
          : translations,
      },
    }
  }
