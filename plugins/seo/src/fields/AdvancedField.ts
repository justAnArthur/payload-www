import type { CheckboxField, DateField, GroupField, TextField } from 'payload'

export type AdvancedFieldOptions = {
  readonly includeAuthor?: boolean
  readonly includeDates?: boolean
  readonly includeNoindex?: boolean
}

/**
 * The "Advanced" group: canonical URL, robots, optional author / dates.
 * Toggle which sub-sections are included via the factory options.
 */
export const AdvancedField = (options: AdvancedFieldOptions = {}): GroupField => {
  const { includeAuthor = true, includeDates = true, includeNoindex = true } = options

  return {
    name: 'advanced',
    type: 'group',
    label: 'Advanced',
    admin: {
      description: 'Canonical URL, robots directives, and other low-level meta.',
    },
    fields: [
      {
        name: 'canonicalUrl',
        type: 'text',
        label: 'Canonical URL',
        admin: { description: 'Overrides the auto-derived canonical. Use absolute URLs.' },
      } as unknown as TextField,
      {
        name: 'robots',
        type: 'text',
        label: 'Robots',
        admin: {
          description: 'Free-form `meta robots` content, e.g. "index, follow" or "noindex, nofollow".',
          placeholder: 'index, follow',
        },
      } as unknown as TextField,
      ...(includeNoindex
        ? [
            ({
              name: 'noindex',
              type: 'checkbox',
              label: 'No-index',
              admin: {
                description:
                  'When on, sets `robots` to "noindex, nofollow" and ignores the manual robots field.',
              },
            } as unknown as CheckboxField),
          ]
        : []),
      ...(includeAuthor
        ? [
            ({
              name: 'author',
              type: 'text',
              label: 'Author',
            } as unknown as TextField),
          ]
        : []),
      ...(includeDates
        ? [
            ({
              name: 'publishedAt',
              type: 'date',
              label: 'Published at',
              admin: { date: { pickerAppearance: 'dayOnly' } },
            } as unknown as DateField),
            ({
              name: 'modifiedAt',
              type: 'date',
              label: 'Modified at',
              admin: { date: { pickerAppearance: 'dayOnly' } },
            } as unknown as DateField),
          ]
        : []),
    ],
  } as unknown as GroupField
}
