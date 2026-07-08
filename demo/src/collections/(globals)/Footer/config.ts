import { link } from '@justanarthur/payload-www/fields'

export const footerFields = [
  {
    name: 'nav',
    type: 'blocks',
    required: true,
    blocks: [
      {
        slug: 'navItem',
        fields: [link({ appearances: false })]
      },
      {
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
      }
    ]
  }
]