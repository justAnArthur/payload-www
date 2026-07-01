import type { CollectionConfig, Field } from 'payload'

import { authenticated, authenticatedOrPublished } from '../../../core/access'
import { slugField } from '../../../core/fields'
import { createRevalidateCollectionHook } from '../../../render/hooks/revalidateCollection'
import { POSTS_RENDER_PATH } from '../../../config/constants'

export const POSTS_SLUG = 'posts'

export type CreatePostsCollectionOptions = {
  /**
   * Optional override for the collection slug. Default: `'posts'`.
   * Hosts that want a different slug (e.g. `'articles'` or `'blog'`)
   * pass it here. Combine with the page route's URL convention and
   * the lib's translator plugin's `collections` list.
   */
  slug?: string
  /**
   * Override the `custom.path` Payload uses to resolve the post's
   * render module. Defaults to the lib's `POSTS_RENDER_PATH`
   * (the lib's `<PostsPage>` Server Component, which renders
   * `title` + `excerpt` + Lexical `content`). Hosts that want a
   * custom render pass their own Server Component's import path
   * here (e.g. `'@/blog/Post#default'`).
   */
  renderPath?: string
  /**
   * Locale prefix mode for path invalidation. Defaults to `'always'`.
   * Set to `'as-needed'` when the host uses next-intl
   * `localePrefix: 'as-needed'` — otherwise the hook invalidates
   * paths the public routes don't use.
   */
  localePrefix?: 'always' | 'as-needed' | 'never'
  /**
   * Default locale for prefix skipping. Falls back to
   * `req.payload.config.localization.defaultLocale` at request time
   * when omitted.
   */
  defaultLocale?: string
}

/**
 * Build the Posts collection. Posts have a simpler shape than
 * Pages: `title` + `excerpt` (both localized) + a Lexical `content`
 * rich text field. Hosts that want blocks can either swap the
 * `content` field for a `blocks` field via the returned config, or
 * define a custom Post shape entirely.
 *
 * The Posts collection exists primarily so the lib's translator
 * plugin has a second localized collection to translate.
 */
export const createPostsCollection = (
  options: CreatePostsCollectionOptions = {}
): CollectionConfig => {
  const {
    renderPath = POSTS_RENDER_PATH,
    slug: collectionSlug = POSTS_SLUG,
    localePrefix,
    defaultLocale
  } = options

  const baseFields: Field[] = [
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true
    },
    {
      name: 'excerpt',
      type: 'text',
      required: false,
      localized: true
    },
    {
      name: 'content',
      type: 'richText',
      required: false,
      localized: true
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: { position: 'sidebar' }
    },
    // Localized slug (per-locale URLs).
    slugField()
  ]

  const { afterChange, afterDelete } = createRevalidateCollectionHook({
    collectionSlug,
    urlPathPrefix: '/posts',
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
      afterChange: [afterChange],
      afterDelete: [afterDelete]
    } as CollectionConfig['hooks'],
    versions: { drafts: { autosave: { interval: 1000 } } }
  } as CollectionConfig
}
