import he from 'he'
import { APIError, type Payload, type PayloadRequest } from 'payload'

import type { TranslateResolver } from '../resolvers/types'
import { findEntityWithConfig } from './findEntityWithConfig'
import { traverseFields } from './traverseFields'
import type { TranslateArgs, TranslateResult, ValueToTranslate } from './types'
import { updateEntity } from './updateEntity'

/** One-line, length-capped preview of a value for translation logs. */
const preview = (value: unknown) => {
  const flat = (typeof value === 'string' ? value : String(value ?? '')).replace(/\s+/g, ' ').trim()
  return JSON.stringify(flat.length > 60 ? `${flat.slice(0, 57)}…` : flat)
}

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

  traverseFields({
    dataFrom,
    emptyOnly: args.emptyOnly,
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

  const resolveResult = await resolver.resolve({
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
  } else {
    const summary: string[] = []

    resolveResult.translatedTexts.forEach((translated, index) => {
      const formattedValue = he.decode(translated)
      const entry = valuesToTranslate[index]

      summary.push(`  ${entry.path ?? '(unknown)'}: ${preview(entry.value)} → ${preview(formattedValue)}`)
      entry.onTranslate(formattedValue)
    })

    req.payload.logger.info({
      msg:
        `[translate] ${entityLabel} ${direction}: translated ${resolveResult.translatedTexts.length} value(s)` +
        (summary.length ? `\n${summary.join('\n')}` : '')
    })

    if (args.update) {
      await updateEntity({
        collectionSlug,
        data: translatedData,
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
      dataFrom
    }
  }

  return result
}
