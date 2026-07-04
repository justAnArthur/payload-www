import { createWWWCollectionGlobal } from "./createWWWCollectionGlobal"

export const POSTS_SLUG = 'posts'
export const POSTS_RENDER_PATH = '@justanarthur/payload-www/render-pages#PostsPage'

export const createPostsCollection =
  () =>
    createWWWCollectionGlobal(
      [
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
        }
      ],
      {
        slug: POSTS_SLUG,
        renderPath: POSTS_RENDER_PATH,
      }
    )
