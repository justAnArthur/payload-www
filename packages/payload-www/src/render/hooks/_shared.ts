// Shared utilities for revalidation hooks. Internal — not exported
// from the lib surface. Underscore prefix marks it private; hosts
// should not import from this module directly.

import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, GlobalAfterChangeHook } from 'payload'

/**
 * `next/cache` is App-Router-only. Resolved lazily and **memoized**
 * so repeated saves don't re-instantiate the module on every call.
 * Without memoization, every Payload save would pay the dynamic
 * import cost + module evaluation cost.
 */
type NextCache = typeof import('next/cache')
let cachePromise: Promise<NextCache> | null = null
function nextCacheImport(): Promise<NextCache> {
  return (cachePromise ??= import('next/cache'))
}

/**
 * Hosts can suppress revalidation for a single operation by passing
 * `context: { disableRevalidate: true }` to Payload's local API.
 * Used by seed scripts and tests so saves don't churn the cache.
 */
export function shouldSkipRevalidate(context: Record<string, unknown> | undefined): boolean {
  return Boolean(context?.disableRevalidate)
}

/**
 * Tiny payload logger surface — keeps the helpers decoupled from
 * the full Payload `Payload` type so tests can pass a stub.
 * `info` is optional because tests don't always wire it up.
 */
type PayloadLike = { logger: { error: (m: string) => void; info?: (m: string) => void } }

/**
 * Fire `revalidatePath` and swallow any error into the payload
 * logger. A failed revalidation must NOT break the Payload save —
 * the doc is already persisted, the cache is just stale, and the
 * next request will pick up the new content eventually.
 */
export async function safeRevalidatePath(payload: PayloadLike, path: string): Promise<void> {
  try {
    const { revalidatePath } = await nextCacheImport()
    revalidatePath(path)
  } catch (error) {
    payload.logger.error(`revalidatePath("${path}") failed: ${String(error)}`)
  }
}

/**
 * Fire `revalidateTag` with the given profile and swallow errors.
 * Profile defaults to `'max'` (Next 15+). Pass a shorter profile
 * for finer-grained invalidation windows.
 */
export async function safeRevalidateTag(
  payload: PayloadLike,
  tag: string,
  profile: 'max' | 'minutes' | 'hours' | 'days' = 'max'
): Promise<void> {
  try {
    const { revalidateTag } = await nextCacheImport()
    revalidateTag(tag, profile)
  } catch (error) {
    payload.logger.error(`revalidateTag("${tag}") failed: ${String(error)}`)
  }
}

/**
 * Re-export Payload hook types so hook factories in this folder
 * can declare a single source for their signatures without pulling
 * `payload` into every consumer's import surface.
 */
export type { CollectionAfterChangeHook, CollectionAfterDeleteHook, GlobalAfterChangeHook }
