import type { Block } from 'payload'
import { createWWWCollectionGlobal } from "./createWWWCollectionGlobal"

export const PAGES_SLUG = 'pages'
export const PAGES_RENDER_PATH = '@justanarthur/payload-www/render-pages#PagesPage'

export const createPagesCollection =
  (blocks: Block[]) =>
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
        }
      ],
      {
        slug: PAGES_SLUG,
        renderPath: PAGES_RENDER_PATH,
      }
    )
