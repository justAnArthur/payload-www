import type { GroupField, SelectField, TextField, UploadField } from 'payload'

export type SocialFieldOptions = {
  /** Uploads collection used by ogImage / twitterImage. */
  readonly relationTo?: string
}

type Option = { label: string; value: string }

const OG_TYPES: Option[] = [
  { label: 'Website', value: 'website' },
  { label: 'Article', value: 'article' },
  { label: 'Profile', value: 'profile' },
  { label: 'Book', value: 'book' },
  { label: 'Music', value: 'music' },
  { label: 'Video', value: 'video' },
]

const TWITTER_CARDS: Option[] = [
  { label: 'Summary', value: 'summary' },
  { label: 'Summary with large image', value: 'summary_large_image' },
  { label: 'App', value: 'app' },
  { label: 'Player', value: 'player' },
]

const ogImage = (relationTo?: string): UploadField | TextField =>
  relationTo
    ? ({
        name: 'ogImage',
        type: 'upload',
        relationTo,
        label: 'OG image',
      } as unknown as UploadField)
    : ({
        name: 'ogImage',
        type: 'text',
        label: 'OG image URL',
        admin: { description: 'Public URL of the Open Graph image.' },
      } as unknown as TextField)

const twitterImage = (relationTo?: string): UploadField | TextField =>
  relationTo
    ? ({
        name: 'twitterImage',
        type: 'upload',
        relationTo,
        label: 'Twitter image',
      } as unknown as UploadField)
    : ({
        name: 'twitterImage',
        type: 'text',
        label: 'Twitter image URL',
        admin: { description: 'Public URL of the Twitter card image.' },
      } as unknown as TextField)

/**
 * The "Social" group: Open Graph + Twitter Card subfields. All optional —
 * the editor UI is responsible for falling back to `title`/`description`/
 * `image` at render time.
 */
export const SocialField = (options: SocialFieldOptions = {}): GroupField => {
  const { relationTo } = options

  return {
    name: 'social',
    type: 'group',
    label: 'Social',
    admin: {
      description:
        'Open Graph and Twitter Card metadata. Falls back to the core fields when empty.',
    },
    fields: [
      // ----- Open Graph -----
      {
        name: 'ogTitle',
        type: 'text',
        label: 'OG title',
        admin: { description: 'Open Graph title. ~40–90 chars.' },
      } as unknown as TextField,
      {
        name: 'ogDescription',
        type: 'textarea',
        label: 'OG description',
        admin: { description: 'Open Graph description. ~100–200 chars.' },
      } as unknown as TextField,
      ogImage(relationTo),
      {
        name: 'ogType',
        type: 'select',
        label: 'OG type',
        admin: { description: 'Open Graph object type — usually "website" or "article".' },
        options: OG_TYPES,
        defaultValue: 'website',
      } as unknown as SelectField,
      {
        name: 'ogUrl',
        type: 'text',
        label: 'OG url',
        admin: { description: 'Canonical URL surfaced in OG shares (often auto-derived).' },
      } as unknown as TextField,
      {
        name: 'ogSiteName',
        type: 'text',
        label: 'OG site name',
      } as unknown as TextField,
      {
        name: 'ogLocale',
        type: 'text',
        label: 'OG locale',
        admin: { description: 'Locale tag, e.g. "en_US".' },
      } as unknown as TextField,
      // ----- Twitter -----
      {
        name: 'twitterCard',
        type: 'select',
        label: 'Twitter card',
        options: TWITTER_CARDS,
        defaultValue: 'summary_large_image',
      } as unknown as SelectField,
      {
        name: 'twitterTitle',
        type: 'text',
        label: 'Twitter title',
        admin: { description: 'Falls back to OG title, then meta title.' },
      } as unknown as TextField,
      {
        name: 'twitterDescription',
        type: 'textarea',
        label: 'Twitter description',
      } as unknown as TextField,
      twitterImage(relationTo),
      {
        name: 'twitterSite',
        type: 'text',
        label: 'Twitter site',
        admin: { description: 'Site @handle, e.g. "@yourbrand".' },
      } as unknown as TextField,
      {
        name: 'twitterCreator',
        type: 'text',
        label: 'Twitter creator',
        admin: { description: 'Author @handle for this entity.' },
      } as unknown as TextField,
    ],
  } as unknown as GroupField
}
