import type { Endpoint, PayloadHandler, PayloadRequest } from 'payload'
import { APIError } from 'payload'

import { findEntityWithConfig } from '../translate/findEntityWithConfig'
import { translateOperation } from '../translate/operation'
import type { TranslatorConfig } from '../types'
import { parseEntityKey, readLocales } from './loadReview'
import { recordTranslationStatus } from './recordTranslationStatus'

type ReviewRequest = { entity?: string; locale?: string; mode?: 'all' | 'missing' }

/** validates the body against the plugin config and the configured locales */
const readReviewRequest = async (req: PayloadRequest) => {
  if (!req.user) throw new APIError('Unauthorized', 401)
  if (!req.json) throw new APIError('Content-Type should be json')

  const body: ReviewRequest = await req.json()
  const { targetLocales } = readLocales(req)

  if (!body.entity || !body.locale || !targetLocales.includes(body.locale)) throw new APIError('Bad Request', 400)

  const target = parseEntityKey(body.entity)
  const pluginConfig = req.payload.config.custom?.translator as TranslatorConfig | undefined
  const allowed = target.globalSlug
    ? pluginConfig?.globals.includes(target.globalSlug as never)
    : pluginConfig?.collections.includes(target.collectionSlug as never)

  if (!allowed || !pluginConfig) throw new APIError('Forbidden', 403)

  return { ...body, ...target, locale: body.locale, pluginConfig }
}

const translateHandler: PayloadHandler = async (req) => {
  const { collectionSlug, globalSlug, id, locale, mode, pluginConfig } = await readReviewRequest(req)
  const { defaultLocale } = readLocales(req)
  const resolver = pluginConfig.resolvers[0]?.key

  if (!resolver) throw new APIError('No resolver configured', 400)

  const result = await translateOperation({
    req,
    collectionSlug,
    globalSlug,
    id,
    emptyOnly: mode !== 'all',
    locale,
    localeFrom: defaultLocale,
    overrideAccess: false,
    resolver,
    update: true
  })

  if (result.success) {
    const { config } = await findEntityWithConfig({ collectionSlug, globalSlug, id, locale: defaultLocale, req })
    await recordTranslationStatus({ req, collectionSlug, globalSlug, id, locale, config, dataFrom: result.dataFrom })
  }

  return Response.json({ success: result.success })
}

const markReviewedHandler: PayloadHandler = async (req) => {
  const { collectionSlug, globalSlug, id, locale } = await readReviewRequest(req)
  const { defaultLocale } = readLocales(req)

  const { config, doc } = await findEntityWithConfig({
    collectionSlug, globalSlug, id, locale: defaultLocale, overrideAccess: false, req
  })

  const user = req.user as { email?: string; id: number | string }

  await recordTranslationStatus({
    req, collectionSlug, globalSlug, id, locale, config, dataFrom: doc,
    reviewedBy: user.email ?? String(user.id)
  })

  return Response.json({ success: true })
}

export const reviewEndpoints: Endpoint[] = [
  { path: '/translator/review/translate', method: 'post', handler: translateHandler },
  { path: '/translator/review/mark-reviewed', method: 'post', handler: markReviewedHandler }
]
