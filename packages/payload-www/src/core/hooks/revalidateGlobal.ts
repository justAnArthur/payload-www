import type { GlobalAfterChangeHook } from 'payload'
import { revalidateTag } from 'next/cache'

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

  return ({ doc, req: { payload, context, locale } }) => {
    if (context.disableRevalidate) return doc
    const tag = `${tagPrefix}_${locale}`
    payload.logger.info(`Revalidating global: ${tag}`)
    try {
      revalidateTag(tag, 'max')
    } catch (error) {
      payload.logger.error(`Error revalidating global ${tag}: ${String(error)}`)
    }
    return doc
  }
}
