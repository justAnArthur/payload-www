import type { Field, TextField, UploadField } from 'payload'

export type ImageFieldOptions = {
  
  readonly relationTo?: string
  readonly localized?: boolean
}


export const ImageField = (options: ImageFieldOptions = {}): Field => {
  const { localized, relationTo } = options

  if (relationTo) {
    return {
      name: 'image',
      type: 'upload',
      relationTo,
      label: 'Image',
      admin: {
        description: 'Social share / SERP thumbnail.'
      },
      localized
    } as unknown as UploadField
  }

  return {
    name: 'image',
    type: 'text',
    label: 'Image URL',
    admin: {
      description: 'Public URL of the social share / SERP image.'
    },
    localized
  } as unknown as TextField
}
