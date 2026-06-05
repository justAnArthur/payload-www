import type { Field, TextField, UploadField } from 'payload'

export type ImageFieldOptions = {
  /**
   * Collection slug of the uploads collection. If provided, the field becomes
   * a relationship picker; otherwise it falls back to a text input where the
   * user can paste an image URL.
   */
  readonly relationTo?: string
  readonly localized?: boolean
}

/**
 * The meta `image` field. Renders as an upload relationship when
 * `relationTo` is provided, otherwise as a plain text/URL input.
 */
export const ImageField = (options: ImageFieldOptions = {}): Field => {
  const { localized, relationTo } = options

  if (relationTo) {
    return {
      name: 'image',
      type: 'upload',
      relationTo,
      label: 'Image',
      admin: {
        description: 'Social share / SERP thumbnail.',
      },
      localized,
    } as unknown as UploadField
  }

  return {
    name: 'image',
    type: 'text',
    label: 'Image URL',
    admin: {
      description: 'Public URL of the social share / SERP image.',
    },
    localized,
  } as unknown as TextField
}
