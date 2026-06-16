import type { GlobalAfterChangeHook } from 'payload'
// `next/cache` is App-Router-only. Resolved lazily inside the hook
// at request time so `payload.config.ts` (a Node entrypoint) can
// import this module without pulling `next/cache` into its module
// graph at load time.

/**
 * Build a per-locale tag-based revalidation hook for a global. The
 * tag is `global_${slug}_${locale}` so per-locale static caching
 * stays fresh.
 */
export function createRevalidateGlobalHook(slug: string): GlobalAfterChangeHook {
  return async ({ doc, req: { payload, context, locale } }) => {
    if (context.disableRevalidate) return doc
    const { revalidateTag } = await import('next/cache')
    const tag = `global_${slug}_${locale}`
    payload.logger.info(`Revalidating global: ${tag}`)
    try {
      revalidateTag(tag, 'max')
    } catch (error) {
      payload.logger.error(`Error revalidating global ${String(error)}`)
    }
    return doc
  }
}
