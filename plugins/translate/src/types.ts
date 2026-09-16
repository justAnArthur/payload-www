import type { CollectionSlug, GlobalSlug } from 'payload'

import type { TranslateResolver } from './resolvers/types'

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
  autoTranslateMode?: 'all' | 'missing',

  
  _options?: {
    
    additionalTraverseRichText?: (args: {
      onText: (siblingData: Record<string, unknown>, attribute?: string) => void
      root: Record<string, unknown>
      siblingData?: Record<string, unknown>
    }) => void
  }
}
