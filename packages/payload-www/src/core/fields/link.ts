import type { Field, GroupField } from 'payload'

import { PAGES_SLUG } from '../../config/constants'

export type LinkAppearances = 'default' | 'outline'

export const appearanceOptions: Record<LinkAppearances, { label: string; value: string }> = {
  default: { label: 'Default', value: 'default' },
  outline: { label: 'Outline', value: 'outline' }
}

export type LinkOptions = {
  appearances?: LinkAppearances[] | false
  disableLabel?: boolean
  /**
   * Collection slugs the link can reference. Payload 3.85 rejects
   * empty arrays, so the lib defaults to `['pages']` (its own Pages
   * collection). Hosts that reference different collections pass
   * their own list.
   */
  relationTo?: string[]
  /** Mark the text fields as `localized: true`. */
  localized?: boolean
  /** Deep-merge into the resulting group. */
  overrides?: Partial<GroupField>
  /** Legacy alias for the host's custom field overrides. */
  linkOverrides?: Partial<GroupField>
  /**
   * Extra fields appended to the link group — e.g. a `description`
   * text field or a `navHover` group for a mega-menu. Lets hosts
   * extend the nav link schema without re-implementing the whole
   * `link` field. Appended after the standard type/label/appearance
   * fields.
   */
  extraFields?: Field[]
}

export const link = (options: LinkOptions = {}): Field => {
  const {
    appearances,
    disableLabel = false,
    relationTo = [PAGES_SLUG],
    localized = false,
    overrides = {},
    extraFields = []
  } = options

  const result: GroupField = {
    name: 'link',
    type: 'group',
    admin: { hideGutter: true },
    fields: [
      {
        type: 'row',
        fields: [
          {
            name: 'type',
            type: 'radio',
            admin: { layout: 'horizontal', width: '50%' },
            defaultValue: 'reference',
            options: [
              { label: 'Internal link', value: 'reference' },
              { label: 'Custom URL', value: 'custom' }
            ]
          },
          {
            name: 'newTab',
            type: 'checkbox',
            admin: { style: { alignSelf: 'flex-end' }, width: '50%' },
            label: 'Open in new tab'
          }
        ]
      }
    ]
  }

  const linkTypes: Field[] = [
    {
      name: 'reference',
      type: 'relationship',
      admin: { condition: (_, siblingData) => siblingData?.type === 'reference' },
      label: 'Document to link to',
      relationTo,
      required: true,
      localized
    },
    {
      name: 'url',
      type: 'text',
      admin: { condition: (_, siblingData) => siblingData?.type === 'custom' },
      label: 'Custom URL',
      required: true,
      localized
    }
  ]

  if (!disableLabel) {
    result.fields.push({
      type: 'row',
      fields: [
        ...linkTypes,
        {
          name: 'label',
          type: 'text',
          admin: { width: '50%' },
          label: 'Label',
          required: true,
          localized
        }
      ]
    })
  } else {
    result.fields = [...result.fields, ...linkTypes]
  }

  if (appearances !== false) {
    const opts = appearances
      ? appearances.map((a) => appearanceOptions[a])
      : [appearanceOptions.default, appearanceOptions.outline]
    result.fields.push({
      name: 'appearance',
      type: 'select',
      admin: { description: 'Choose how the link should be rendered.' },
      defaultValue: 'default',
      options: opts
    })
  }

  if (extraFields.length) {
    result.fields.push(...extraFields)
  }

  return { ...result, ...overrides } as Field
}
