import type { GlobalAfterChangeHook } from 'payload'

import { safeRevalidateTag, shouldSkipRevalidate } from './_shared'

/**
 * Build a tag-based revalidation hook for a global. Fires two tags
 * after a save:
 *
 * - `global_${slug}` — invalidates the lib's `getCachedGlobal` cache
 *   and any host caches that key by slug alone.
 * - `global_${slug}_${locale}` — invalidates per-locale cache slots
 *   for hosts that key by `[slug, locale]`.
 *
 * The hook fires both so the lib's single-slot cache and the
 * per-locale pattern both stay fresh regardless of which the host
 * uses.
 */
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
