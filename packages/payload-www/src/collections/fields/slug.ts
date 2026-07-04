import type { Field } from 'payload'

export const slugField = (): Field => ({
  name: 'slug',
  type: 'text',
  required: true,
  unique: true,
  index: true,
  localized: true,
  admin: {
    position: 'sidebar',
    description: 'Lowercase, hyphens for words. Use the `_` divider for nesting, e.g. `about_us` → `/about/us`.'
  },
  validate: (value: unknown) => {
    if (typeof value !== 'string') return 'Slug must be a string'
    if (value !== '' && !/^[a-z0-9_-]+$/.test(value)) return 'Slug must be lowercase, with hyphens (no spaces or special characters).'
    return true
  }
})
