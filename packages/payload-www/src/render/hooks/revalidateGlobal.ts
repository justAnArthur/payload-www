import type { GlobalAfterChangeHook } from 'payload'
// `next/cache` is App-Router-only and must NOT be eagerly imported at the
// module top level. Header/Footer globals re-export this factory from
// `data/collections/globals/*` so `payload.config.ts` (a Node entrypoint)
// ends up loading this module. We resolve `revalidateTag` lazily inside
// the hook at request time — the only point the function is called in
// an App Router context.

export type RevalidateGlobalOptions = {
  tagPrefix?: string
}

/**
 * Build a per-locale tag-based revalidation hook for a global. The
 * hook revalidates `${tagPrefix}_${locale}` so per-locale static
 * caching stays fresh.
 */
export function createRevalidateGlobalHook(
  arg: string | RevalidateGlobalOptions = 'global'
): GlobalAfterChangeHook {
  const tagPrefix = typeof arg === 'string' ? arg : (arg.tagPrefix ?? 'global')
  const localeSuffix = true

  return async ({ doc, req: { payload, context, locale } }) => {
    if (context.disableRevalidate) return doc
    const { revalidateTag } = await import('next/cache')
    const tag = localeSuffix ? `${tagPrefix}_${locale}` : tagPrefix
    payload.logger.info(`Revalidating global: ${tag}`)
    try {
      revalidateTag(tag, 'max')
    } catch (error) {
      payload.logger.error(`Error revalidating global ${String(error)}`)
    }
    return doc
  }
}
