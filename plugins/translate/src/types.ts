import type { CollectionSlug, GlobalSlug } from 'payload'

import type { TranslateResolver } from './resolvers/types'

export type TranslatorConfig = {
  
  collections: CollectionSlug[]
  
  disabled?: boolean
  
  globals: GlobalSlug[]
  
  resolvers: TranslateResolver[],

  
  autoTranslate?: boolean,

  
  _options?: {
    
    additionalTraverseRichText?: (args: {
      onText: (siblingData: Record<string, unknown>, attribute?: string) => void
      root: Record<string, unknown>
      siblingData?: Record<string, unknown>
    }) => void
  }
}
