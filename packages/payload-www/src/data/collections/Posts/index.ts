import type { CollectionConfig, Field } from 'payload'

import { authenticated, authenticatedOrPublished } from '../../../core/access'
import { createRevalidateGlobalHook } from '../../../render/hooks/revalidateGlobal'

export const POSTS_SLUG = 'posts'

export type CreatePostsCollectionOptions = {
  /**
   * Optional override for the `custom.path` Payload uses to resolve
   * the post's render module. The lib doesn't ship a default
   * `PostsPage` Server Component (the host defines it). Set this to
   * your own Server Component's import path.
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
): CollectionConfig<'posts'> => {
  const { renderPath } = options

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
      type: 'textarea',
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
    slug: POSTS_SLUG,
    ...(renderPath ? { custom: { path: renderPath } } : {}),
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
  } as CollectionConfig<'posts'>
}
