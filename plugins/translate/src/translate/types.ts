import { Doc } from "./findEntityWithConfig"

export type ValueToTranslate = {
  onTranslate: (translatedValue: any) => void
  value: any
  /** Dot/bracket path of the field this value came from, for logging (e.g. `blocks[1](flexVerticalBlocks).grid[0].block[0].features[2].title`). */
  path?: string
}

/** one translatable field as the traversal sees it, before any translation happens */
export type TranslatableField = {
  path: string
  type: 'json' | 'richText' | 'slug' | 'text'
  source: unknown
  target: unknown
}

export type TranslateArgs = {
  collectionSlug?: string
  data?: Record<string, any>
  emptyOnly?: boolean
  globalSlug?: string
  /** with `emptyOnly`, also replace fields that still hold the source copy */
  retranslateIdentical?: boolean
  id?: number | string
  
  locale: string
  localeFrom: string
  overrideAccess?: boolean
  resolver: string
  update?: boolean
}

export type TranslateResult =
  | {
  success: false
}
  | {
  success: true
  translatedData: Record<string, any>,
  /** values sent to the resolver; 0 means the target needed nothing */
  translatedCount: number,
  dataFrom: Doc
}

export type TranslateEndpointArgs = Omit<TranslateArgs, 'update'>
