import type { SanitizedCollectionConfig, SanitizedGlobalConfig } from 'payload'

import { traverseFields } from '../translate/traverseFields'
import type { TranslatableField } from '../translate/types'
import type { TranslatorConfig } from '../types'

/** every translatable field with its source and current target value, nothing translated */
export const collectTranslatableFields = ({ config, dataFrom, dataTarget, options }: {
  config: SanitizedCollectionConfig | SanitizedGlobalConfig
  dataFrom: Record<string, unknown>
  dataTarget: Record<string, unknown>
  options?: TranslatorConfig['_options']
}): TranslatableField[] => {
  const fields: TranslatableField[] = []

  traverseFields({
    dataFrom,
    fields: config.fields,
    translatedData: structuredClone(dataTarget ?? {}),
    valuesToTranslate: [],
    syncedValues: { count: 0 },
    onField: (field) => fields.push(field),
    _options: options
  })

  return fields
}
