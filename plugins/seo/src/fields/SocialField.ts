import type { GroupField, SelectField, TextField, UploadField } from 'payload'

export type SocialFieldOptions = {
  
  readonly relationTo?: string

  readonly localized?: boolean
}

type Option = { label: string; value: string }

const OG_TYPES: Option[] = [
  { label: 'Website', value: 'website' },
  { label: 'Article', value: 'article' },
  { label: 'Profile', value: 'profile' },
  { label: 'Book', value: 'book' },
  { label: 'Music', value: 'music' },
  { label: 'Video', value: 'video' }
]

const TWITTER_CARDS: Option[] = [
  { label: 'Summary', value: 'summary' },
  { label: 'Summary with large image', value: 'summary_large_image' },
  { label: 'App', value: 'app' },
  { label: 'Player', value: 'player' }
]

const ogImage = (relationTo?: string, localized?: boolean): UploadField | TextField =>
  relationTo
    ? ({
      name: 'ogImage',
      type: 'upload',
      relationTo,
      label: 'OG image',
      localized
    } as unknown as UploadField)
    : ({
      name: 'ogImage',
      type: 'text',
      label: 'OG image URL',
      admin: { description: 'Public URL of the Open Graph image.' },
      localized
    } as unknown as TextField)

const twitterImage = (relationTo?: string, localized?: boolean): UploadField | TextField =>
  relationTo
    ? ({
      name: 'twitterImage',
      type: 'upload',
      relationTo,
      label: 'Twitter image',
      localized
    } as unknown as UploadField)
    : ({
      name: 'twitterImage',
      type: 'text',
      label: 'Twitter image URL',
      admin: { description: 'Public URL of the Twitter card image.' },
      localized
    } as unknown as TextField)


export const SocialField = (options: SocialFieldOptions = {}): GroupField => {
  const { relationTo, localized } = options

  return {
    name: 'social',
    type: 'group',
    label: 'Social',
    admin: {
      description:
        'Open Graph and Twitter Card metadata. Falls back to the core fields when empty.'
    },
    fields: [
      
      {
        name: 'ogTitle',
        type: 'text',
        label: 'OG title',
        admin: { description: 'Open Graph title. ~40–90 chars.' },
        localized
      } as unknown as TextField,
      {
        name: 'ogDescription',
        type: 'textarea',
        label: 'OG description',
        admin: { description: 'Open Graph description. ~100–200 chars.' },
        localized
      } as unknown as TextField,
      ogImage(relationTo, localized),
      {
        name: 'ogType',
        type: 'select',
        label: 'OG type',
        admin: { description: 'Open Graph object type — usually "website" or "article".' },
        options: OG_TYPES,
        defaultValue: 'website'
      } as unknown as SelectField,

      {
        name: 'twitterCard',
        type: 'select',
        label: 'Twitter card',
        options: TWITTER_CARDS,
        defaultValue: 'summary_large_image'
      } as unknown as SelectField,
      {
        name: 'twitterTitle',
        type: 'text',
        label: 'Twitter title',
        admin: { description: 'Falls back to OG title, then meta title.' },
        localized
      } as unknown as TextField,
      {
        name: 'twitterDescription',
        type: 'textarea',
        label: 'Twitter description',
        localized
      } as unknown as TextField,
      twitterImage(relationTo, localized)
    ]
  } as unknown as GroupField
}
