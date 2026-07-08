import type { Block, Field } from 'payload'
import { link } from '@justanarthur/payload-www/fields'

const fields: Field[] = [
  {
    name: 'heading',
    type: 'text',
    required: true,
    localized: true
  },
  {
    name: 'body',
    type: 'textarea',
    localized: true
  },
  link({
    appearances: ['default', 'outline'],
    disableLabel: false
  })
]

export const Cta: Block = {
  slug: 'cta',
  interfaceName: 'CtaBlock',
  fields
}