import { Doc } from "./findEntityWithConfig"

export type ValueToTranslate = {
  onTranslate: (translatedValue: any) => void
  value: any
  /** Dot/bracket path of the field this value came from, for logging (e.g. `blocks[1](flexVerticalBlocks).grid[0].block[0].features[2].title`). */
  path?: string
}

export type TranslateArgs = {
  collectionSlug?: string
  data?: Record<string, any>
  emptyOnly?: boolean
  globalSlug?: string
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
  dataFrom: Doc
}

export type TranslateEndpointArgs = Omit<TranslateArgs, 'update'>
