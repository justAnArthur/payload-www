import type { TextField } from 'payload'

import { TitleFieldComponent } from './TitleFieldComponent'

export type TitleFieldOptions = {
  readonly localized?: boolean
  readonly maxLength?: number
  readonly minLength?: number
}

/**
 * Server-safe field factory. Builds the `meta.title` text field config and
 * wires up the client `TitleFieldComponent` for the admin UI.
 */
export const TitleField = (options: TitleFieldOptions = {}): TextField => {
  return {
    name: 'title',
    type: 'text',
    label: 'Title',
    admin: {
      description: 'Shown in search results and the browser tab. Target 50–60 characters.',
      components: {
        Field: {
          clientProps: {
            maxLength: options.maxLength,
            minLength: options.minLength,
          },
          path: '@justanarthur/payload-plugin-seo/client#TitleFieldComponent',
        },
      },
    },
    localized: options.localized,
    maxLength: options.maxLength,
    minLength: options.minLength,
  } as unknown as TextField
}
