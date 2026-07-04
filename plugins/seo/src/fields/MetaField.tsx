import type { Field, GroupField, Tab, TabsField, UIField } from 'payload'

import { AdvancedField } from './AdvancedField'
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
}


export const MetaField = (options: MetaFieldOptions = {}): GroupField => {
  const {
    hasGenerateAi = false,
    hasGenerateFn = false,
    interfaceName,
    relationTo,
    hidePreview = false
  } = options

  
  const tabs: TabsField = {
    type: 'tabs',
    tabs: [
      {
        name: 'content',
        label: 'Content',
        fields: [
          TitleField() as unknown as Field,
          DescriptionField() as unknown as Field,
          KeywordsField() as unknown as Field,
          ImageField({ relationTo }) as unknown as Field
        ]
      },
      {
        name: 'social',
        label: 'Social',
        fields: [SocialField({ relationTo }) as unknown as Field]
      },
      {
        name: 'advanced',
        label: 'Advanced',
        fields: [AdvancedField() as unknown as Field]
      },
      ...(hidePreview
        ? []
        : [
          {
            name: 'preview',
            label: 'Preview',
            fields: [
              {
                type: 'ui',
                name: '_preview',
                admin: {
                  components: {
                    Field: {
                      clientProps: { pathPrefix: 'meta' },
                      path: '@justanarthur/payload-plugin-seo/client#MetaPreview'
                    }
                  }
                }
              } as unknown as UIField
            ]
          }
        ])
    ]
  }

  
  
  
  const fieldPaths = buildFieldPaths(tabs.tabs as Tab[])

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

