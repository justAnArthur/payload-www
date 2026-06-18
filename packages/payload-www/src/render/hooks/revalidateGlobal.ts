import type { GlobalAfterChangeHook } from 'payload'
// `next/cache` is App-Router-only. Resolved lazily inside the hook
// at request time so `payload.config.ts` (a Node entrypoint) can
// import this module without pulling `next/cache` into its module
// graph at load time.

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
  return async ({ doc, req: { payload, context, locale } }) => {
    if (context.disableRevalidate) return doc
    const { revalidateTag } = await import('next/cache')
    const tags = [`global_${slug}`, `global_${slug}_${locale}`]
    payload.logger.info(`Revalidating global: ${tags.join(', ')}`)
    for (const tag of tags) {
      try {
        revalidateTag(tag, 'max')
      } catch (error) {
        payload.logger.error(`Error revalidating global tag "${tag}": ${String(error)}`)
      }
    }
    return doc
  }
}
