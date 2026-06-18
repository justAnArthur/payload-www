import type { CollectionConfig, Field } from 'payload'

import { authenticated, authenticatedOrPublished } from '../../../core/access'
import { createRevalidateGlobalHook } from '../../../render/hooks/revalidateGlobal'
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
  const { renderPath = POSTS_RENDER_PATH, slug: collectionSlug = POSTS_SLUG } = options

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
    slugField
  ]

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
      // Per-locale revalidation tag so per-locale static caching of
      // post render output stays fresh. Hosts that use a render
      // module with `unstable_cache` / `revalidateTag` will benefit.
      afterChange: [createRevalidateGlobalHook(POSTS_SLUG) as any]
    } as CollectionConfig['hooks'],
    versions: { drafts: { autosave: { interval: 1000 } } }
  } as CollectionConfig
}
