import he from 'he'
import { APIError, type Payload, type PayloadRequest } from 'payload'

import type { TranslateResolver } from '../resolvers/types'
import { findEntityWithConfig } from './findEntityWithConfig'
import { loadWrongLanguageCheck } from '../utils/languageDetector'
import { samePlaceholders } from '../utils/placeholders'
import { plainText } from '../utils/plainText'
import { traverseFields } from './traverseFields'
import type { TranslateArgs, TranslateResult, ValueToTranslate } from './types'
import { updateEntity } from './updateEntity'

/** One-line, length-capped preview of a value for translation logs. */
const preview = (value: unknown) => {
  const flat = (typeof value === 'string' ? value : String(value ?? '')).replace(/\s+/g, ' ').trim()
  return JSON.stringify(flat.length > 60 ? `${flat.slice(0, 57)}…` : flat)
}

const localeCodes = (req: PayloadRequest) =>
  (req.payload.config.localization ? req.payload.config.localization.locales : [])
    .map((each) => typeof each === 'string' ? each : each.code)

export type TranslateOperationArgs = (
  | {
  payload: Payload
}
  | {
  req: PayloadRequest
}
  ) &
  TranslateArgs

export const translateOperation = async (args: TranslateOperationArgs) => {
  const req: PayloadRequest =
    'req' in args
      ? args.req
      : ({
        payload: args.payload
      } as PayloadRequest)

  const { collectionSlug, globalSlug, id, locale, localeFrom, overrideAccess } = args

  const { config, doc: dataFrom } = await findEntityWithConfig({
    collectionSlug,
    globalSlug,
    id,
    locale: localeFrom,
    overrideAccess,
    req
  })

  const resolver = (
    (req.payload.config.custom?.translator?.resolvers as TranslateResolver[]) ?? []
  ).find((each) => each.key === args.resolver)

  if (!resolver) throw new APIError(`Resolver with the key ${args.resolver} was not found`)

  const valuesToTranslate: ValueToTranslate[] = []

  let translatedData = args.data

  if (!translatedData) {
    const { doc } = await findEntityWithConfig({
      collectionSlug,
      globalSlug,
      id,
      locale,
      overrideAccess,
      req
    })

    translatedData = doc
  }

  // untranslated mode also replaces copy written in another locale's language
  const wrongLanguageCheck = args.retranslateIdentical && req.payload.config.custom?.translator?.languageDetection !== false
    ? await loadWrongLanguageCheck(localeCodes(req))
    : null
  const isWrongLanguage = wrongLanguageCheck
    ? (target: unknown) => Boolean(wrongLanguageCheck(plainText(target), args.locale))
    : undefined

  traverseFields({
    dataFrom,
    emptyOnly: args.emptyOnly,
    retranslateIdentical: args.retranslateIdentical,
    isWrongLanguage,
    fields: config.fields,
    translatedData,
    valuesToTranslate,

    _options: req.payload.config.custom?.translator?._options
  })

  const entityLabel = `${collectionSlug || globalSlug}#${id ?? ''}`
  const direction = `${args.localeFrom}→${args.locale}`

  req.payload.logger.info({
    msg: `[translate] ${entityLabel} ${direction}: traversed ${valuesToTranslate.length} translatable value(s)`
  })

  const resolveResult = valuesToTranslate.length === 0
    ? { success: true as const, translatedTexts: [] as string[] }
    : await resolver.resolve({
    localeFrom: args.localeFrom,
    localeTo: args.locale,
    req,
    texts: valuesToTranslate.map((each) => each.value)
  })

  let result: TranslateResult

  if (!resolveResult.success) {
    req.payload.logger.warn({
      msg:
        `[translate] ${entityLabel} ${direction}: resolver failed — ${valuesToTranslate.length} value(s) traversed but NOT translated` +
        (valuesToTranslate.length
          ? `\n${valuesToTranslate.map((v) => `  ${v.path ?? '(unknown)'}: ${preview(v.value)}`).join('\n')}`
          : '')
    })
    result = {
      success: false
    }
  } else if (resolveResult.translatedTexts.length !== valuesToTranslate.length) {
    // results map back by position; a merged or split item would shift every later field
    req.payload.logger.error({
      msg: `[translate] ${entityLabel} ${direction}: resolver returned ${resolveResult.translatedTexts.length} value(s) for ${valuesToTranslate.length} — nothing applied`
    })
    result = {
      success: false
    }
  } else {
    const summary: string[] = []

    resolveResult.translatedTexts.forEach((translated, index) => {
      const entry = valuesToTranslate[index]
      // resolvers html-escape their output; a source that already holds entities keeps them
      const formattedValue = typeof entry.value === 'string' && /&[#\w]+;/.test(entry.value)
        ? translated
        : he.decode(translated)

      if (typeof entry.value === 'string' && !samePlaceholders(entry.value, formattedValue)) {
        summary.push(`  ${entry.path ?? '(unknown)'}: placeholders changed, kept source ${preview(entry.value)}`)
        entry.onTranslate(entry.value)
        return
      }

      summary.push(`  ${entry.path ?? '(unknown)'}: ${preview(entry.value)} → ${preview(formattedValue)}`)
      entry.onTranslate(formattedValue)
    })

    req.payload.logger.info({
      msg:
        `[translate] ${entityLabel} ${direction}: translated ${resolveResult.translatedTexts.length} value(s)` +
        (summary.length ? `\n${summary.join('\n')}` : '')
    })

    if (args.update && valuesToTranslate.length > 0) {
      const { _locale, _parent_id, createdAt, updatedAt, ...data } = translatedData

      await updateEntity({
        collectionSlug,
        data,
        depth: 0,
        globalSlug,
        id,
        locale,
        overrideAccess,
        req
      })
    }

    result = {
      success: true,
      translatedData,
      translatedCount: valuesToTranslate.length,
      dataFrom
    }
  }

  return result
}
