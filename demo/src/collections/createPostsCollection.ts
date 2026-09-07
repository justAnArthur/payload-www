import { createWWWCollectionGlobal } from "@justanarthur/payload-www/collections"

export const POSTS_SLUG = 'posts'
// ponytail: see render.tsx — pointing the render path at the page file itself
// would recurse (default_ → renderWWWDataModule → page → default_). Use a
// separate render module like categories do.
export const POSTS_RENDER_PATH = '@/app/(frontend)/(pages)/[locale]/posts/[slug]/render'

export const createPostsCollection = () =>
  createWWWCollectionGlobal(
    [
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
            label: 'Content',
            fields: [
              {
                name: 'excerpt',
                type: 'text',
                localized: true
              },
              {
                name: 'content',
                type: 'richText',
                label: false,
                localized: true
              }
            ]
          },
          {
            label: 'Meta',
            fields: [
              {
                name: 'categories',
                type: 'relationship',
                admin: { position: 'sidebar' },
                hasMany: true,
                relationTo: 'categories'
              }
            ]
          }
        ]
      }
    ],
    {
      slug: POSTS_SLUG,
      renderPath: POSTS_RENDER_PATH
    }
  )