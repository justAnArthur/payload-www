import { nestedDocsPlugin } from '@payloadcms/plugin-nested-docs'
import { redirectsPlugin } from '@payloadcms/plugin-redirects'
import { Plugin } from 'payload'
import { revalidateRedirects } from '@/lib/(payload)/hooks/revalidateRedirects'
import { getServerSideURL } from '@/lib/utils/getURL'
import { openAIResolver, translator } from '@payload-starter/translator'
import { seoPlugin as seo } from '@payload-starter/seo'

export const plugins: Plugin[] = [
  redirectsPlugin({
    collections: ['pages', 'posts'],
    overrides: {
      // @ts-expect-error - This is a valid override, mapped fields don't resolve to the same type
      fields: ({ defaultFields }) => {
        return defaultFields.map((field) => {
          if ('name' in field && field.name === 'from') {
            return {
              ...field,
              admin: {
                description: 'You will need to rebuild the website when changing this field.',
              },
            }
          }
          return field
        })
      },
      hooks: {
        afterChange: [revalidateRedirects],
      },
    },
  }),
  nestedDocsPlugin({
    collections: ['categories'],
    generateURL: (docs) => docs.reduce((url, doc) => `${url}/${doc.slug}`, ''),
  }),
  seo({
    generateTitleAi: ({ doc, req }) =>
      `Generate meta SEO title for webpage with next title: "${doc?.title}" in language=${req.locale}`,
    generateDescriptionAi: ({ doc, req }) =>
      `Generate meta SEO description for webpage with next title "${doc?.title}" in language=${req.locale}`,
    generateURL: ({ doc }) => {
      const url = getServerSideURL()

      return doc?.slug ? `${url}/${doc.slug}` : url
    },
    openaiApiKey: process.env.OPENAI_KEY,
  }),
  translator({
    collections: ['posts', 'pages'],
    globals: [],
    resolvers: [
      // copyResolver(),
      openAIResolver({
        apiKey: process.env.OPENAI_KEY!,
      }),
    ],
  }),
]
