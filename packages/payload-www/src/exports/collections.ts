import { createPagesCollection, type CreatePagesCollectionOptions, HOME_PAGE_SLUG, PAGES_SLUG } from '../data/collections/Pages/index'
import { createPostsCollection, type CreatePostsCollectionOptions, POSTS_SLUG } from '../data/collections/Posts/index'
import { createHeaderGlobal, type CreateHeaderGlobalOptions } from '../data/collections/globals/Header/config'
import { createFooterGlobal, type CreateFooterGlobalOptions } from '../data/collections/globals/Footer/config'
import { generatePreviewPath } from '../data/collections/previewPath'

export default {
  createPagesCollection,
  createPostsCollection,
  createHeaderGlobal,
  createFooterGlobal,
  generatePreviewPath,
  HOME_PAGE_SLUG,
  PAGES_SLUG,
  POSTS_SLUG
}

export {
  createPagesCollection,
  createPostsCollection,
  createHeaderGlobal,
  createFooterGlobal,
  generatePreviewPath,
  HOME_PAGE_SLUG,
  PAGES_SLUG,
  POSTS_SLUG,
  type CreatePagesCollectionOptions,
  type CreatePostsCollectionOptions,
  type CreateHeaderGlobalOptions,
  type CreateFooterGlobalOptions
}
