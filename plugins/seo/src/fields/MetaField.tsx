import type { Field, GroupField, Tab, TabsField, UIField } from 'payload'

import { AdvancedField } from './AdvancedField'
import { DescriptionField } from './DescriptionField'
import { ImageField } from './ImageField'
import { KeywordsField } from './KeywordsField'
import { SocialField } from './SocialField'
import { TitleField } from './TitleField'

export type MetaFieldOptions = {
  /** Show the OpenAI button (when only `openaiApiKey` is configured). */
  readonly hasGenerateAi?: boolean
  /** Show the custom-function button (when `generateSEO` is configured). */
  readonly hasGenerateFn?: boolean
  /** Uploads collection used by image, ogImage, twitterImage. */
  readonly relationTo?: string
  /** Suppress the live preview tab. */
  readonly hidePreview?: boolean
  /** TypeScript interface name for the resulting group type. */
  readonly interfaceName?: string
}

/**
 * Walks a tabs structure and returns a flat map of `fieldName → tabQualifiedPath`
 * (relative to the parent group, e.g. `content.title`, `social.social.ogTitle`).
 *
 * Rules:
 *  - Named tabs prefix everything inside with `tabName.`
 *  - Group fields inside a tab further prefix with `groupName.`
 *  - UI fields (no data) are skipped.
 *
 * This is intentionally kept simple — it handles one level of nesting (tab → optional
 * group → fields), which covers the full MetaField structure.
 */
const buildFieldPaths = (tabs: Tab[]): Record<string, string> => {
  const map: Record<string, string> = {}

  for (const tab of tabs) {
    const tabName = (tab as { name?: string }).name
    if (!tabName) continue

    for (const field of tab.fields ?? []) {
      const f = field as { name?: string; type?: string; fields?: Field[] }
      if (!f.name || f.type === 'ui') continue

      if (f.type === 'group' && Array.isArray(f.fields)) {
        // Nested group: path = tabName.groupName.fieldName
        for (const sub of f.fields) {
          const s = sub as { name?: string; type?: string }
          if (s.name && s.type !== 'ui') {
            map[s.name] = `${tabName}.${f.name}.${s.name}`
          }
        }
      } else {
        // Direct field in tab: path = tabName.fieldName
        map[f.name] = `${tabName}.${f.name}`
      }
    }
  }

  return map
}

/**
 * The single `meta` group field. Drop it into a collection / global to get
 * every SEO subfield (title, description, keywords, image, Open Graph,
 * Twitter Card, advanced) plus a single "Generate" button and a live
 * preview — no more 5 separate fields, no more 4 separate endpoints.
 */
export const MetaField = (options: MetaFieldOptions = {}): GroupField => {
  const {
    hasGenerateAi = false,
    hasGenerateFn = false,
    interfaceName,
    relationTo,
    hidePreview = false,
  } = options

  // Build tabs first so we can derive field paths from the actual structure.
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
          ImageField({ relationTo }) as unknown as Field,
        ],
      },
      {
        name: 'social',
        label: 'Social',
        fields: [SocialField({ relationTo }) as unknown as Field],
      },
      {
        name: 'advanced',
        label: 'Advanced',
        fields: [AdvancedField() as unknown as Field],
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
                        path: '@justanarthur/payload-plugin-seo/client#MetaPreview',
                      },
                    },
                  },
                } as unknown as UIField,
              ],
            },
          ]),
    ],
  }

  // Derive the flat SEOMeta-key → tab-qualified-path mapping from the tabs above.
  // This means any rename of a tab or field is automatically reflected in the
  // Generate button without touching GenerateButton.tsx.
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
            pathPrefix: 'meta',
          },
          path: '@justanarthur/payload-plugin-seo/client#GenerateButton',
        },
      },
    },
  }

  return {
    name: 'meta',
    type: 'group',
    label: 'SEO',
    admin: {
      description: 'Search engine and social share metadata for this entity.',
    },
    fields: [generateUi, tabs as unknown as Field],
    interfaceName,
  } as unknown as GroupField
}

