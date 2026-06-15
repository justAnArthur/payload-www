import type { Block, CollectionConfig, Field } from 'payload'

import { authenticated, authenticatedOrPublished } from '../../../core/access'
import { populatePublishedAt } from '../../../core/hooks/populatePublishedAt'
import { createRevalidatePageHooks } from '../../../core/hooks/revalidatePage'
import { createTranslateToOtherLocalesHook } from '../../../core/hooks/translateToOtherLocales'
import { generatePreviewPath } from '../previewPath'

export const HOME_PAGE_SLUG = ''
export const pageSlugNestedDivider = '_'
export const PAGES_SLUG = 'pages'

export type CreatePagesCollectionOptions = {
  /**
   * Blocks the Pages collection accepts. Required — pass your block
   * configs in. The lib doesn't ship defaults; pages are too
   * domain-specific.
   */
  blocks: Block[]
  /**
   * Host-supplied render path. Wired as `custom.path` on the
   * collection so `withWWWConfig` can register it in the import map.
   */
  renderPath?: string
  /**
   * The slug field generator. The lib's default returns a single
   * `slugField` from payload. Hosts with nested URL schemes can
   * override.
   */
  slugField?: Field[]
  /**
   * Field factory for the SEO tab. Pass the SEO fields from
   * `@justanarthur/payload-plugin-seo/fields`. The lib doesn't ship
   * a default — that's an external dep.
   */
  seoFields?: Field[]
  /**
   * Preview-path builder. Defaults to the lib's
   * `generatePreviewPath` for `pages`.
   */
  previewPath?: (slug: string | undefined) => string | null
  /**
   * Locales the translate-to-other-locales hook should target. The
   * host's `defaultLocale` is the source; the rest are the targets.
   * Omit to skip the translation hook.
   */
  locales?: { defaultLocale: string; all: readonly string[] }
}

/**
 * Build the Pages collection. The host supplies blocks, slug field,
 * and SEO fields; the lib wires the access/hooks/render path. This
 * mirrors the camasys `payload-www/collections/Pages/index.ts` shape
 * but with all host-specific paths replaced by parameters.
 */
export const createPagesCollection = (
  blocks: Block[],
  options: Omit<CreatePagesCollectionOptions, 'blocks'> = {},
): CollectionConfig<'pages'> => {
  const {
    renderPath,
    slugField: slugFields,
    seoFields = [],
    previewPath = (slug) => generatePreviewPath({ slug, collection: 'pages' }),
    locales,
  } = options

  const baseFields: Field[] = [
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
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
              admin: { initCollapsed: true },
            },
          ],
          label: 'Content',
        },
        ...(seoFields.length > 0
          ? [
              {
                name: 'meta',
                label: 'SEO',
                fields: seoFields,
                localized: true,
              },
            ]
          : []),
      ],
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: { position: 'sidebar' },
    },
    ...(slugFields ?? []),
  ]

  const { afterChange: revalidateAfterChange, afterDelete: revalidateAfterDelete } =
    createRevalidatePageHooks({ homeSlug: HOME_PAGE_SLUG, nestedSlugDivider: pageSlugNestedDivider })

  const translateHook = locales
    ? createTranslateToOtherLocalesHook({
        defaultLocale: locales.defaultLocale,
        locales: locales.all,
        collection: 'pages',
        onlyWhenPublished: true,
      })
    : null

  return {
    slug: PAGES_SLUG,
    ...(renderPath ? { custom: { path: renderPath } } : {}),
    access: {
      create: authenticated,
      delete: authenticated,
      read: authenticatedOrPublished,
      update: authenticated,
    },
    defaultPopulate: { title: true, slug: true },
    admin: {
      defaultColumns: ['title', 'slug', 'updatedAt'],
      livePreview: {
        url: ({ data, req }) => previewPath(typeof data?.slug === 'string' ? data.slug : ''),
      },
      preview: (data, { req }) => previewPath(typeof data?.slug === 'string' ? data.slug : ''),
      useAsTitle: 'title',
    },
    fields: baseFields,
    hooks: {
      afterChange: translateHook
        ? [revalidateAfterChange, translateHook]
        : [revalidateAfterChange],
      beforeChange: [populatePublishedAt],
      afterDelete: [revalidateAfterDelete],
    } as CollectionConfig['hooks'],
    versions: {
      drafts: { autosave: { interval: 1000 }, schedulePublish: true },
      maxPerDoc: 50,
    },
  } as CollectionConfig<'pages'>
}
