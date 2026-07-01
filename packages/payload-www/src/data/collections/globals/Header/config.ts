import type { Block, Field, GlobalConfig } from 'payload'

import { link } from '../../../../core/fields/link'
import { createRevalidateGlobalHook } from '../../../../render/hooks/revalidateGlobal'
import { HEADER_RENDER_PATH, PAGES_SLUG } from '../../../../config/constants'

export type CreateHeaderGlobalOptions = {
  /**
   * Optional override for the `custom.path` Payload uses to resolve
   * the header's render module. Default: the lib's `HEADER_RENDER_PATH`.
   */
  renderPath?: string
  /**
   * Collection slugs the nav's link fields can reference. Required
   * by Payload 3.85 — empty `relationTo` arrays are rejected.
   * Defaults to `['pages']` (the lib's Pages collection). Pass a
   * different list when your host has additional linkable collections.
   */
  linkRelationTo?: string[]
  /**
   * Extra fields appended to each `navColumn` link — e.g. a
   * `description` text field or a `navHover` group for a mega-menu.
   * Lets hosts enrich the column-link schema without redefining the
   * whole nav.
   */
  navColumnLinkFields?: Field[]
  /**
   * Extra fields appended to each top-level `navItem` link.
   */
  navItemLinkFields?: Field[]
}

/**
 * Build the Header global. The lib's default shape: a `nav` blocks
 * field with two block types — `navColumn` (a titled group of links)
 * and `navItem` (a single link).
 */
export const createHeaderGlobal = (
  options: CreateHeaderGlobalOptions = {}
): GlobalConfig => {
  const {
    renderPath = HEADER_RENDER_PATH,
    linkRelationTo = [PAGES_SLUG],
    navColumnLinkFields = [],
    navItemLinkFields = []
  } = options

  const navColumnBlock: Block = {
    slug: 'navColumn',
    fields: [
      { name: 'title', type: 'text', required: true, localized: true },
      { name: 'links', type: 'array', fields: [link({ appearances: false, localized: true, relationTo: linkRelationTo, extraFields: navColumnLinkFields })] }
    ]
  }

  const navItemBlock: Block = {
    slug: 'navItem',
    fields: [link({ appearances: false, localized: true, relationTo: linkRelationTo, extraFields: navItemLinkFields })]
  }

  return {
    slug: 'header',
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
      afterChange: [createRevalidateGlobalHook('header')]
    }
  }
}
