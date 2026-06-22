import type { Block, CollectionConfig } from 'payload'

import { authenticated, authenticatedOrPublished } from '../../../core/access'
import { createRevalidateCollectionHook } from '../../../render/hooks/revalidateCollection'
import { STATIC_PAGES_SLUG } from '../../../config/constants'

export { STATIC_PAGES_SLUG }

export type CreateStaticPagesCollectionOptions = {
  /**
   * Blocks the StaticPages collection accepts. Hosts pass the same
   * `blocks` they use for `createPagesCollection` (or a smaller
   * subset — e.g. just `pageHeroBlock` + `ctaBlock` + `featureGridBlock`).
   * The lib does not curate a separate block set for system pages.
   */
  blocks: Block[]
}

export const createStaticPagesCollection = (
  blocks: Block[]
): CollectionConfig => {
  const { afterChange, afterDelete } = createRevalidateCollectionHook({
    collectionSlug: STATIC_PAGES_SLUG,
    // No URL — static pages are addressed by `kind`, not slug.
    // The hook's per-id tag (`collection_static-pages_<id>`) and
    // the collection-wide tag (`static-pages` via the `sitemapTag`
    // override) are all we need.
    pathMode: 'tag-only',
    sitemapTag: 'static-pages'
  })

  return {
    slug: STATIC_PAGES_SLUG,
    // Postgres caps identifiers at 63 chars. The default table-name
    // for a blocks field is `${collectionTableName}_${fieldName}_...`;
    // with the long block-slug + nested field paths that host blocks
    // carry (e.g. `featureGridBlock` → `sectionHeader.titleParts`),
    // the generated name exceeds the cap. The two `dbName` overrides
    // below trim the prefix while keeping the slug (`staticPages`)
    // and the API/admin field name (`blocks`) intact.
    dbName: 'sp',
    admin: { group: 'System', useAsTitle: 'title' },
    access: {
      create: authenticated,
      delete: authenticated,
      read: authenticatedOrPublished,
      update: authenticated
    },
    fields: [
      {
        name: 'kind',
        type: 'select',
        required: true,
        unique: true,
        index: true,
        options: [
          { label: 'Not found (404)', value: 'not-found' },
          { label: 'Server error (500)', value: 'server-error' },
          { label: 'Search empty', value: 'search-empty' },
          { label: 'Offline', value: 'offline' }
        ],
        admin: {
          position: 'sidebar',
          description: 'Which system page this row powers. One row per kind.'
        }
      },
      {
        name: 'title',
        type: 'text',
        required: true,
        localized: true,
        admin: { description: 'Admin-only label. Not rendered.' }
      },
      {
        type: 'tabs',
        tabs: [
          {
            fields: [
              {
                name: 'blocks',
                type: 'blocks',
                localized: true,
                blocks,
                admin: { initCollapsed: true },
                // Trim the nested table prefix to fit under Postgres's
                // 63-char identifier cap (see collection's `dbName`).
                dbName: 'b'
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
      }
    ],
    hooks: {
      afterChange: [afterChange],
      afterDelete: [afterDelete]
    } as CollectionConfig['hooks'],
    versions: { drafts: { autosave: { interval: 1000 } } }
  } as CollectionConfig
}
