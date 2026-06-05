import type { TextareaField } from 'payload'

import { DescriptionFieldComponent } from './DescriptionFieldComponent'

export type DescriptionFieldOptions = {
  readonly localized?: boolean
  readonly maxLength?: number
  readonly minLength?: number
}

/**
 * Server-safe field factory. Builds the `meta.description` textarea config
 * and wires up the client `DescriptionFieldComponent` for the admin UI.
 */
export const DescriptionField = (options: DescriptionFieldOptions = {}): TextareaField => {
  return {
    name: 'description',
    type: 'textarea',
    label: 'Description',
    admin: {
      description: 'Shown under the title in search results. Target 100–150 characters.',
      components: {
        Field: {
          clientProps: {
            maxLength: options.maxLength,
            minLength: options.minLength,
          },
          path: '@justanarthur/payload-plugin-seo/client#DescriptionFieldComponent',
        },
      },
    },
    localized: options.localized,
    maxLength: options.maxLength,
    minLength: options.minLength,
  } as unknown as TextareaField
}
