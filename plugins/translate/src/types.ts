import type { CollectionSlug, GlobalSlug } from 'payload'

import type { TranslateResolver } from './resolvers/types'

export type TranslatorConfig = {
  /**
   * Collections with the enabled translator in the admin UI
   */
  collections: CollectionSlug[]
  /**
   * Disable the plugin
   */
  disabled?: boolean
  /**
   * Globals with the enabled translator in the admin UI
   */
  globals: GlobalSlug[]
  /**
   * Add resolvers that you want to include, examples on how to write your own in ./plugin/src/resolvers
   */
  resolvers: TranslateResolver[],

  /**
   * Advanced traversal options. Mirrors the options accepted by the
   * internal field walker — keep in sync if you need the latest shape.
   */
  _options?: {
    /**
     * Hook invoked while walking each rich-text node. Lets you append
     * extra text segments to be translated (e.g. custom lexical nodes).
     */
    additionalTraverseRichText?: (args: {
      onText: (siblingData: Record<string, unknown>, attribute?: string) => void
      root: Record<string, unknown>
      siblingData?: Record<string, unknown>
    }) => void
  }
}
