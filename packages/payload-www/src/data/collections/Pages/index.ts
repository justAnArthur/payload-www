import type { Block, CollectionConfig, Field } from 'payload'

import { authenticated, authenticatedOrPublished } from '../../../core/access'
import { createRevalidatePageHooks } from '../../../render/hooks/revalidatePage'
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
   * Optional override for the `custom.path` Payload uses to resolve
   * the page's render module. Default: the lib's `PAGES_RENDER_PATH`
   * (a Server Component that calls `RenderBlocks`). Use this when
   * you've defined your own Server Component for the collection.
   */
  renderPath?: string
}

export const createPagesCollection = (
  blocks: Block[],
  options: Omit<CreatePagesCollectionOptions, 'blocks'> = {}
): CollectionConfig<'pages'> => {
  const { renderPath = PAGES_RENDER_PATH } = options

  const slugField: Field = {
    name: 'slug',
    type: 'text',
    required: true,
    unique: true,
    index: true,
    admin: { position: 'sidebar' }
  }

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
    slugField
  ]

  const { afterChange: revalidateAfterChange, afterDelete: revalidateAfterDelete } =
    createRevalidatePageHooks()

  return {
    slug: PAGES_SLUG,
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
  } as CollectionConfig<'pages'>
}
