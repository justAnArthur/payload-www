import { link } from './fields/link'
import { createWWWCollectionGlobal } from "./createWWWCollectionGlobal"
import { GlobalConfig } from "payload"

export const HEADER_SLUG = 'header'
export const HEADER_RENDER_PATH = '@justanarthur/payload-www/render-pages#HeaderPage'

export const createHeaderGlobal =
  () =>
    createWWWCollectionGlobal<GlobalConfig>(
      [
        {
          name: 'nav',
          type: 'blocks',
          required: true,
          blocks: [{
            slug: 'navItem',
            fields: [link({ appearances: false })]
          }, {
            slug: 'navColumn',
            fields: [
              {
                name: 'title',
                type: 'text',
                required: true,
                localized: true
              },
              {
                name: 'links',
                type: 'array',
                fields: [link({ appearances: false, localized: true })]
              }
            ]
          }]
        }
      ],
      {
        slug: HEADER_SLUG,
        renderPath: HEADER_RENDER_PATH,
      }
    )

