import type { CollectionSlug, GlobalSlug } from 'payload'

import type { TranslateResolver } from './resolvers/types'
import type { TranslateMode } from './utils/translateMode'

export type TranslatorConfig = {
  
  collections: CollectionSlug[]
  
  disabled?: boolean
  
  globals: GlobalSlug[]
  
  resolvers: TranslateResolver[],

  
  autoTranslate?: boolean,

  /**
   * what a publish in the default locale does to the other locales.
   * `missing` (default) fills empty fields and keeps existing translations and slugs;
   * `all` re-translates every field.
   */
  autoTranslateMode?: TranslateMode,

  /** adds the /admin/translations review view, its endpoints and the status collection (default true) */
  review?: boolean,

  
  _options?: {
    
    additionalTraverseRichText?: (args: {
      onText: (siblingData: Record<string, unknown>, attribute?: string) => void
      root: Record<string, unknown>
      siblingData?: Record<string, unknown>
    }) => void
  }
}
