import type { Field, GroupField, Tab, TabsField, UIField } from 'payload'

import { buildFieldPaths } from './buildFieldPaths'
import { DescriptionField } from './DescriptionField'
import { ImageField } from './ImageField'
import { KeywordsField } from './KeywordsField'
import { SocialField } from './SocialField'
import { TitleField } from './TitleField'

export type MetaFieldOptions = {

  readonly hasGenerateAi?: boolean

  readonly hasGenerateFn?: boolean

  readonly relationTo?: string

  readonly hidePreview?: boolean

  readonly interfaceName?: string

  readonly localized?: boolean
}


export const MetaField = (options: MetaFieldOptions = {}): GroupField => {
  const {
    hasGenerateAi = false,
    hasGenerateFn = false,
    interfaceName,
    relationTo,
    hidePreview = false,
    localized
  } = options


  const tabs: TabsField = {
    type: 'tabs',
    tabs: [
      {
        name: 'content',
        label: 'Content',
        fields: [
          TitleField({ localized }) as unknown as Field,
          DescriptionField({ localized }) as unknown as Field,
          KeywordsField({ localized }) as unknown as Field,
          ImageField({ relationTo, localized }) as unknown as Field
        ]
      },
      {
        name: 'social',
        label: 'Social',
        fields: [SocialField({ relationTo, localized }) as unknown as Field]
      }
    ]
  }


  const fieldPaths = buildFieldPaths(tabs.tabs as Tab[])

  if (!hidePreview) {
    tabs.tabs.push({
      name: 'preview',
      label: 'Preview',
      fields: [
        {
          type: 'ui',
          name: '_preview',
          admin: {
            components: {
              Field: {
                clientProps: { pathPrefix: 'meta', fieldPaths },
                path: '@justanarthur/payload-plugin-seo/client#MetaPreview'
              }
            }
          }
        } as unknown as UIField
      ]
    })
  }

  const generateUi: UIField = {
    type: 'ui',
    name: '_generate',
    admin: {
      components: {
        Field: {
          clientProps: {
            hasGenerateAi,
            hasGenerateFn,
            fieldPaths,
            pathPrefix: 'meta'
          },
          path: '@justanarthur/payload-plugin-seo/client#GenerateButton'
        }
      }
    }
  }

  return {
    name: 'meta',
    type: 'group',
    label: 'SEO',
    admin: {
      description: 'Search engine and social share metadata for this entity.'
    },
    fields: [generateUi, tabs as unknown as Field],
    interfaceName
  } as unknown as GroupField
}