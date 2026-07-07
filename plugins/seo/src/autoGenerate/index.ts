import type { CollectionConfig } from 'payload'

import type { GenerateSEO, SEOPluginConfig } from '../types'
import { extractMetaFromScalars } from './extractMeta'



export const createDefaultGenerateSEO = (pluginConfig: SEOPluginConfig): GenerateSEO => {
  const deriveFrom =
    typeof pluginConfig?.autoGenerate === 'object' && pluginConfig.autoGenerate !== null
      ? pluginConfig.autoGenerate.deriveFrom
      : undefined

  return async (args) => {
    const collectionConfig = (args.collectionConfig ??
      (args.globalConfig as CollectionConfig | undefined)) as CollectionConfig | undefined
    return extractMetaFromScalars({
      data: args.doc as Record<string, unknown>,
      collectionConfig,
      locale: args.locale,
      deriveFrom
    })
  }
}

export { extractScalars, lexicalToPlainText, type ExtractedDoc, type ScalarValue } from './extractScalars'
export { extractMetaFromScalars, type ExtractMetaArgs } from './extractMeta'
export { runAutoGenerate, type RunAutoGenerateOptions } from './runAutoGenerate'




export const __autoGenerateModulePin: undefined = undefined