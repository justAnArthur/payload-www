import type { Field } from 'payload'

import { link, type LinkOptions } from './link'

export { link, appearanceOptions, type LinkAppearances, type LinkOptions } from './link'

export const linkGroup = (options: LinkOptions = {}): Field => ({
  name: 'links',
  type: 'array',
  fields: [link(options)],
  admin: { initCollapsed: true },
})
