import type { Block, GlobalConfig } from 'payload'

import { link } from '../../../../core/fields/link'
import { createRevalidateGlobalHook } from '../../../../render/hooks/revalidateGlobal'
import { FOOTER_RENDER_PATH, PAGES_SLUG } from '../../../../config/constants'

export type CreateFooterGlobalOptions = {
  /**
   * Optional override for the `custom.path` Payload uses to resolve
   * the footer's render module. Default: the lib's `FOOTER_RENDER_PATH`.
   */
  renderPath?: string
  /**
   * Collection slugs the nav's link fields can reference. Required
   * by Payload 3.85 — empty `relationTo` arrays are rejected.
   * Defaults to `['pages']` (the lib's Pages collection). Pass a
   * different list when your host has additional linkable collections.
   */
  linkRelationTo?: string[]
}

/**
 * Build the Footer global. The lib's default shape mirrors the
 * Header: a `nav` blocks field with `navColumn` (a titled group of
 * links) and `navItem` (a single link) blocks.
 */
export const createFooterGlobal = (
  options: CreateFooterGlobalOptions = {}
): GlobalConfig => {
  const { renderPath = FOOTER_RENDER_PATH, linkRelationTo = [PAGES_SLUG] } = options

  const navColumnBlock: Block = {
    slug: 'navColumn',
    fields: [
      { name: 'title', type: 'text', required: true, localized: true },
      { name: 'links', type: 'array', fields: [link({ appearances: false, localized: true, relationTo: linkRelationTo })] }
    ]
  }

  const navItemBlock: Block = {
    slug: 'navItem',
    fields: [link({ appearances: false, localized: true, relationTo: linkRelationTo })]
  }

  return {
    slug: 'footer',
    custom: { path: renderPath },
    access: { read: () => true },
    fields: [
      {
        name: 'nav',
        type: 'blocks',
        required: true,
        blocks: [navColumnBlock, navItemBlock]
      }
    ],
    hooks: {
      afterChange: [createRevalidateGlobalHook('footer')]
    }
  }
}
