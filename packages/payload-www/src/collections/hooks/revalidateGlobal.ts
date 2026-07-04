import type { GlobalAfterChangeHook } from 'payload'

import { safeRevalidateTag, shouldSkipRevalidate } from './_shared'


export function createRevalidateGlobalHook(slug: string): GlobalAfterChangeHook {
  console.log('[WWW] render/hooks:createRevalidateGlobalHook slug=', slug)
  return async ({ doc, req: { payload, context, locale } }) => {
    if (shouldSkipRevalidate(context)) return doc
    const tags = [`global_${slug}`, `global_${slug}_${locale}`]
    console.log('[WWW] render/hooks:revalidateGlobal slug=', slug, 'locale=', locale, 'tags=', JSON.stringify(tags))
    payload.logger.info?.(`Revalidating global: ${tags.join(', ')}`)
    for (const tag of tags) {
      await safeRevalidateTag(payload, tag)
    }
    return doc
  }
}
