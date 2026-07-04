import { link } from './fields/link'
import { createWWWCollectionGlobal } from "./createWWWCollectionGlobal"
import { GlobalConfig } from "payload"

export const FOOTER_SLUG = 'footer'
export const FOOTER_RENDER_PATH = '@justanarthur/payload-www/render-pages#FooterPage'

export const createFooterGlobal =
  () =>
    createWWWCollectionGlobal<GlobalConfig>(
      [
        {
          name: 'nav',
          type: 'blocks',
          required: true,
          blocks: [{
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
                fields: [link({ appearances: false })]
              }
            ]
          }, {
            slug: 'navItem',
            fields: [link({ appearances: false })]
          }]
        }
      ],
      {
        slug: FOOTER_SLUG,
        renderPath: FOOTER_RENDER_PATH,
      }
    )
