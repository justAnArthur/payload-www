import type { Block, Field } from 'payload'

const fields: Field[] = [
  {
    name: 'media',
    type: 'upload',
    relationTo: 'media',
    required: true
  },
  {
    name: 'caption',
    type: 'text'
  }
]

export const Media: Block = {
  slug: 'media',
  interfaceName: 'MediaBlock',
  fields
}