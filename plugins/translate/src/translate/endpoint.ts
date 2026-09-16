import type { PayloadHandler } from 'payload'
import { APIError } from 'payload'

import type { TranslatorConfig } from '../types'
import { translateOperation } from './operation'
import type { TranslateEndpointArgs } from './types'

export const translateEndpoint: PayloadHandler = async (req) => {
  if (!req.user) throw new APIError('Unauthorized', 401)
  if (!req.json) throw new APIError('Content-Type should be json')

  const args: TranslateEndpointArgs = await req.json()

  const { collectionSlug, data, emptyOnly, globalSlug, id, locale, localeFrom, resolver } = args

  // only the entities the plugin was configured for, so it can't read or bill for anything else
  const pluginConfig = req.payload.config.custom?.translator as TranslatorConfig | undefined
  const allowed = globalSlug
    ? pluginConfig?.globals.includes(globalSlug as never)
    : pluginConfig?.collections.includes(collectionSlug as never)

  if (!allowed) throw new APIError('Forbidden', 403)

  const result = await translateOperation({
    collectionSlug,
    data,
    emptyOnly,
    globalSlug,
    id,
    locale,
    localeFrom,
    overrideAccess: false,
    req,
    resolver,
    update: false
  })

  return Response.json(result)
}
