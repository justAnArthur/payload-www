import type { Block, Field } from 'payload'



const columnFields: Field[] = [
  {
    name: 'text',
    type: 'text',
    required: true
  },
  {
    name: 'enableLink',
    type: 'checkbox'
  },
  {
    name: 'linkUrl',
    type: 'text',
    admin: {
      condition: (_data, siblingData) => Boolean(siblingData?.enableLink)
    }
  },
  {
    name: 'linkLabel',
    type: 'text',
    admin: {
      condition: (_data, siblingData) => Boolean(siblingData?.enableLink)
    }
  }
]

export const Content: Block = {
  slug: 'content',
  interfaceName: 'ContentBlock',
  fields: [
    {
      name: 'columns',
      type: 'array',
      admin: { initCollapsed: true },
      fields: columnFields
    }
  ]
}
