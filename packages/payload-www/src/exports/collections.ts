import {
  createPagesCollection,
  type CreatePagesCollectionOptions,
  HOME_PAGE_SLUG,
  PAGES_SLUG
} from '../collections/Pages/index'
import { createPostsCollection, type CreatePostsCollectionOptions, POSTS_SLUG } from '../collections/Posts/index'
import {
  createStaticPagesCollection,
  type CreateStaticPagesCollectionOptions,
  STATIC_PAGES_SLUG
} from '../collections/StaticPages/index'
import { createHeaderGlobal, type CreateHeaderGlobalOptions } from '../collections/globals/Header/config'
import { createFooterGlobal, type CreateFooterGlobalOptions } from '../collections/globals/Footer/config'
import { generatePreviewPath } from '../collections/previewPath'

export default {
  createPagesCollection,
  createPostsCollection,
  createStaticPagesCollection,
  createHeaderGlobal,
  createFooterGlobal,
  generatePreviewPath,
  HOME_PAGE_SLUG,
  PAGES_SLUG,
  POSTS_SLUG,
  STATIC_PAGES_SLUG
}

export {
  createPagesCollection,
  createPostsCollection,
  createStaticPagesCollection,
  createHeaderGlobal,
  createFooterGlobal,
  generatePreviewPath,
  HOME_PAGE_SLUG,
  PAGES_SLUG,
  POSTS_SLUG,
  STATIC_PAGES_SLUG,
  type CreatePagesCollectionOptions,
  type CreatePostsCollectionOptions,
  type CreateStaticPagesCollectionOptions,
  type CreateHeaderGlobalOptions,
  type CreateFooterGlobalOptions
}
