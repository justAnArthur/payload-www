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
   * Auto-translate every save in the default locale to the other
   * configured locales via Payload's job queue.
   *
   * When `true`, the plugin:
   * - registers `createTranslateTask()` and `createTranslateWorkflow()`
   *   in `config.jobs` (idempotent — skips if a task/workflow with
   *   the same slug is already registered, so host-customized
   *   factories survive),
   * - prepends `createAutoTranslateCollectionHook` /
   *   `createAutoTranslateGlobalHook` to each collection/global
   *   listed in `collections` / `globals`.
   *
   * Default: `false`. Public factories stay exported for hosts that
   * need per-entity control.
   */
  autoTranslate?: boolean,

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
