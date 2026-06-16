import type { Block, GlobalConfig } from 'payload'

import { link } from '../../../../core/fields/link'
import { createRevalidateGlobalHook } from '../../../../render/hooks/revalidateGlobal'
import { createTranslateToOtherLocalesHook } from '../../../../core/hooks/translateToOtherLocales'

export type CreateHeaderGlobalOptions = {
  renderPath?: string
  /** Optional override for the link field used by `navItem` blocks. */
  linkField?: (options?: { appearances?: false | 'default'[] }) => any
  /** Optional override for the link group field used by `navColumn` blocks. */
  linkGroupField?: (options?: any) => any
  /** Locales the translation hook should target. Omit to skip. */
  locales?: { defaultLocale: string; all: readonly string[] }
}

/**
 * Build the Header global. Mirrors the camasys `payload-www/.../Header/config.ts`
 * shape: a `nav` blocks field with two block types — `navColumn` (a
 * titled group of `linkGroup` items) and `navItem` (a single link).
 */
export const createHeaderGlobal = (
  options: CreateHeaderGlobalOptions = {}
): GlobalConfig => {
  const {
    renderPath,
    linkField = (opts) => link({ ...opts, disableLabel: true, appearances: false }),
    linkGroupField,
    locales
  } = options

  const navColumnBlock: Block = {
    slug: 'navColumn',
    fields: [
      {
        name: 'title',
        type: 'text',
        required: true,
        localized: true
      },
      ...(linkGroupField
        ? [linkGroupField({ linkOverrides: { fields: [{ name: 'description', type: 'text', localized: true }] } })]
        : [])
    ]
  }

  const navItemBlock: Block = {
    slug: 'navItem',
    fields: [linkField({ appearances: false })]
  }

  const translateHook = locales
    ? createTranslateToOtherLocalesHook({
      defaultLocale: locales.defaultLocale,
      locales: locales.all,
      global: 'header'
    })
    : null

  return {
    slug: 'header',
    ...(renderPath ? { custom: { path: renderPath } } : {}),
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
      afterChange: translateHook
        ? [
          createRevalidateGlobalHook('global_header'),
          translateHook as any
        ]
        : [createRevalidateGlobalHook('global_header')]
    }
  }
}
