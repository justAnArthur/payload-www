import type { Field, FieldHook, TextField } from 'payload'
import { name } from '../../../../package.json'
import { formatSlug, SLUG_LOCK_FIELD, SLUG_PATTERN, slugFromTitle } from './format'

export type SlugFieldOptions = {
  /** field the slug is generated from; without it the slug is typed by hand */
  useAsTitle?: string
  /** `_` nests the url (`about_team` → `/about/team`); for catch-all routes like pages */
  nested?: boolean
}

// valid slugs pass untouched, so legacy ones like `a--b` keep their live urls
function formatSlugHook(nested: boolean, useAsTitle?: string): FieldHook {
  return ({ value, data, operation }) => {
    if (typeof value === 'string') return !value || SLUG_PATTERN.test(value) ? value : formatSlug(value, nested)

    const title = useAsTitle && data?.[useAsTitle]
    if (operation !== 'create' || typeof title !== 'string') return value

    // an empty slug addresses the index, so a title with no letters leaves it unset
    return slugFromTitle(title, nested) || value
  }
}

// an unset lock turns on only for a slug the title produces, so the index's '' and seeded slugs stay put
function lockHook(nested: boolean, useAsTitle: string): FieldHook {
  return ({ value, siblingData, originalDoc, operation }) => {
    if (typeof value === 'boolean') return value

    const slug = siblingData.slug ?? originalDoc?.slug
    const title = siblingData[useAsTitle] ?? originalDoc?.[useAsTitle]
    // on create the slug hook runs beside this one, so a missing slug is the one about to be generated
    if (slug == null) return operation === 'create'

    return typeof title === 'string' && slug === slugFromTitle(title, nested, slug)
  }
}

export function slugField({ useAsTitle, nested = false }: SlugFieldOptions = {}): Field {
  const slug: TextField = {
    name: 'slug',
    type: 'text',
    required: true,
    unique: true,
    index: true,
    localized: true,
    admin: {
      position: 'sidebar',
      description: nested
        ? 'Lowercase, hyphens for words. Nest with `/` or `_`, e.g. `about/us` → `/about/us`.'
        : 'Lowercase, hyphens for words.'
    },
    hooks: { beforeValidate: [formatSlugHook(nested, useAsTitle)] },
    validate: (value: unknown) => {
      if (typeof value !== 'string') return 'Slug must be a string'
      if (value !== '' && !SLUG_PATTERN.test(value)) return 'Slug must be lowercase, with hyphens (no spaces or special characters).'
      return true
    }
  }

  if (!useAsTitle) return slug

  return {
    type: 'row',
    admin: { position: 'sidebar' },
    fields: [
      {
        ...slug,
        admin: {
          ...slug.admin,
          width: '100%',
          components: { Field: { path: `${name}/fields-client#SlugField`, clientProps: { useAsTitle, nested } } }
        }
      },
      {
        name: SLUG_LOCK_FIELD,
        type: 'checkbox',
        localized: true,
        hooks: { beforeValidate: [lockHook(nested, useAsTitle)] },
        admin: { hidden: true, disableBulkEdit: true, disableListColumn: true, disableListFilter: true }
      }
    ]
  }
}
