import type { Field } from 'payload'

export type SlugFieldOptions = {
  /** Field name. Default: `'slug'`. */
  name?: string
  /**
   * Allow the `_` nesting divider in the slug so `about_us` renders at
   * `/about/us`. Relaxes validation and documents the convention in the
   * admin UI. Pair with `createCollectionPageExports({ nested: true })`.
   * Default: `false`.
   */
  nested?: boolean
  /**
   * Localize the slug — one slug per locale (`/about` in `en`, `/o-nas`
   * in `sk`), stored in the collection's `_locales` table. This is the
   * default: the lib's collections are multilingual, so per-locale slugs
   * power localized URLs and hreflang alternates. Pass `false` for a
   * single shared slug.
   */
  localized?: boolean
}

const FLAT_PATTERN = /^[a-z0-9-]+$/
const NESTED_PATTERN = /^[a-z0-9_-]+$/

/**
 * The slug field shared by the lib's Pages / Posts collections: a
 * required, unique, indexed, sidebar text field, localized by default.
 *
 * The empty string is reserved for the home page (rendered at
 * `/${locale}`), so validation only rejects non-empty malformed values.
 */
export const slugField = (options: SlugFieldOptions = {}): Field => {
  const { name = 'slug', nested = false, localized = true } = options

  const pattern = nested ? NESTED_PATTERN : FLAT_PATTERN
  const invalidMessage = nested
    ? 'Slug must be lowercase, with hyphens or the `_` nesting divider (no spaces or other special characters)'
    : 'Slug must be lowercase, with hyphens (no spaces or special characters)'

  return {
    name,
    type: 'text',
    required: true,
    unique: true,
    index: true,
    localized,
    admin: {
      position: 'sidebar',
      ...(nested
        ? { description: 'Lowercase, hyphens for words. Use the `_` divider for nesting, e.g. `about_us` → `/about/us`.' }
        : {})
    },
    validate: (value: unknown) => {
      if (typeof value !== 'string') return 'Slug must be a string'
      if (value !== '' && !pattern.test(value)) return invalidMessage
      return true
    }
  }
}
