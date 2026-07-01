import type { Block, CollectionConfig, Field } from 'payload'

import { authenticated, authenticatedOrPublished } from '../../../core/access'
import { slugField } from '../../../core/fields'
import {
  createRevalidateCollectionHook,
  type CreateRevalidateCollectionHookOptions
} from '../../../render/hooks/revalidateCollection'
import { PAGES_RENDER_PATH, PAGES_SLUG as _PAGES_SLUG } from '../../../config/constants'

export const HOME_PAGE_SLUG = ''
// Re-exported from `config/constants` so the lib has a single source
// of truth for the Pages collection slug. Hosts can import it from
// either `@justanarthur/payload-www/collections` or the `/constants`
// surface.
export const PAGES_SLUG = _PAGES_SLUG

export type CreatePagesCollectionOptions = {
  /**
   * Blocks the Pages collection accepts.
   */
  blocks: Block[]
  /**
   * Optional override for the collection slug. Default: `'pages'`.
   * Hosts that want a different slug (e.g. `'site_pages'`) pass
   * it here. The lib's Header / Footer `linkRelationTo` default
   * uses `'pages'` — combine this with a matching
   * `linkRelationTo` to keep nav links targeting the right
   * collection.
   */
  slug?: string
  /**
   * Optional override for the `custom.path` Payload uses to resolve
   * the page's render module. Default: the lib's `PAGES_RENDER_PATH`
   * (a Server Component that calls `RenderBlocks`). Use this when
   * you've defined your own Server Component for the collection.
   */
  renderPath?: string
  /**
   * Locale prefix mode for path invalidation. Defaults to `'always'`
   * (preserves current behavior). Set to `'as-needed'` when the host
   * uses next-intl `localePrefix: 'as-needed'` — otherwise the hook
   * invalidates paths the public routes don't use.
   */
  localePrefix?: CreateRevalidateCollectionHookOptions['localePrefix']
  /**
   * Default locale for prefix skipping. Falls back to
   * `req.payload.config.localization.defaultLocale` at request time
   * when omitted.
   */
  defaultLocale?: CreateRevalidateCollectionHookOptions['defaultLocale']
  /**
   * Enable nested (hierarchical) slugs. When `true`, the slug field
   * additionally accepts the `_` nesting divider (so `about_us`
   * renders at `/about/us`) and the admin description documents the
   * convention. Pair with `createCollectionPageExports({ nested: true })`
   * on the matching route. Default: `false` (flat, hyphen-only slugs).
   */
  nested?: boolean
}

export const createPagesCollection = (
  blocks: Block[],
  options: Omit<CreatePagesCollectionOptions, 'blocks'> = {}
): CollectionConfig => {
  const {
    renderPath = PAGES_RENDER_PATH,
    slug: collectionSlug = PAGES_SLUG,
    localePrefix,
    defaultLocale,
    nested = false
  } = options

  const baseFields: Field[] = [
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true
    },
    {
      type: 'tabs',
      tabs: [
        {
          fields: [
            {
              name: 'blocks',
              type: 'blocks',
              blocks,
              required: true,
              admin: { initCollapsed: true }
            }
          ],
          label: 'Content'
        }
      ]
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: { position: 'sidebar' }
    },
    // Localized slug (per-locale URLs). `nested` also allows the `_`
    // hierarchy divider (`about_us` → `/about/us`).
    slugField({ nested })
  ]

  const { afterChange: revalidateAfterChange, afterDelete: revalidateAfterDelete } =
    createRevalidateCollectionHook({
      collectionSlug,
      urlPathPrefix: '',
      localePrefix,
      defaultLocale
    })

  return {
    slug: collectionSlug,
    custom: { path: renderPath },
    access: {
      create: authenticated,
      delete: authenticated,
      read: authenticatedOrPublished,
      update: authenticated
    },
    fields: baseFields,
    hooks: {
      afterChange: [revalidateAfterChange],
      afterDelete: [revalidateAfterDelete]
    } as CollectionConfig['hooks'],
    versions: { drafts: { autosave: { interval: 1000 } } }
  } as CollectionConfig
}
