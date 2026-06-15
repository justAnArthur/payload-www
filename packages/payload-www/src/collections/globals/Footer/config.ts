import type { Block, GlobalConfig } from 'payload'

import { linkGroup } from '../../../fields/linkGroup'
import { createRevalidateGlobalHook } from '../../../hooks/revalidateGlobal'
import { createTranslateToOtherLocalesHook } from '../../../hooks/translateToOtherLocales'

export type CreateFooterGlobalOptions = {
  renderPath?: string
  /**
   * Blocks the footer's `blocks` field accepts. The lib doesn't
   * ship defaults — pass your footer blocks (CTA, RichText, etc.)
   * in. Mark them `localized: true` to follow the camasys pattern.
   */
  blocks?: Block[]
  /** Override the link group field used inside the `nav` array. */
  linkGroupField?: (options?: any) => any
  /** Locales the translation hook should target. Omit to skip. */
  locales?: { defaultLocale: string; all: readonly string[] }
}

/**
 * Build the Footer global. Mirrors the camasys
 * `payload-www/.../Footer/config.ts` shape: a `blocks` field for the
 * footer's main content, a `nav` array of titled link groups, and
 * a `socials` array.
 */
export const createFooterGlobal = (
  options: CreateFooterGlobalOptions = {},
): GlobalConfig => {
  const { renderPath, blocks = [], linkGroupField = linkGroup, locales } = options

  const translateHook = locales
    ? createTranslateToOtherLocalesHook({
        defaultLocale: locales.defaultLocale,
        locales: locales.all,
        global: 'footer',
      })
    : null

  return {
    slug: 'footer',
    ...(renderPath ? { custom: { path: renderPath } } : {}),
    access: { read: () => true },
    fields: [
      {
        name: 'blocks',
        type: 'blocks',
        blocks,
        localized: true,
        required: true,
        admin: { description: 'Primarily used to have a CTA block.' },
      },
      {
        name: 'nav',
        type: 'array',
        required: true,
        localized: true,
        fields: [
          { name: 'title', type: 'text', required: true, localized: true },
          linkGroupField({
            appearances: false,
            overrides: { localized: true } as any,
            linkOverrides: { localized: true },
          }),
        ],
      },
      {
        name: 'socials',
        type: 'array',
        required: false,
        localized: true,
        fields: [
          { name: 'platform', type: 'text', localized: true, required: true },
          { name: 'url', type: 'text', localized: true, required: true },
          { name: 'icon', type: 'text', localized: false },
        ],
      },
    ],
    hooks: {
      afterChange: translateHook
        ? [createRevalidateGlobalHook('global_footer'), translateHook as any]
        : [createRevalidateGlobalHook('global_footer')],
    },
  }
}
