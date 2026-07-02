import type { Field } from 'payload'

import { link, type LinkOptions } from './link'

export { link, appearanceOptions, type LinkAppearances, type LinkOptions } from './link'

export const linkGroup = (options: LinkOptions = {}): Field => {
  console.log('[WWW] core/fields:linkGroup relationTo=', JSON.stringify(options.relationTo ?? 'link-default'), 'extraFields=', options.extraFields?.length ?? 0)
  return {
    name: 'links',
    type: 'array',
    fields: [link(options)],
    admin: { initCollapsed: true }
  }
}
