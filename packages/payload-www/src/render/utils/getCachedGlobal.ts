import type { DataFromGlobalSlug, SanitizedConfig } from 'payload'
import { unstable_cache } from 'next/cache'

import { queryGlobal } from '../metadata/query'

/**
 * Build an `unstable_cache`-wrapped getter for a Payload global.
 * Tag is `global_<slug>` (covers all locales); the lib's
 * `createRevalidateGlobalHook` fires both this tag and a per-locale
 * `global_<slug>_<locale>` so both single-slot and per-locale cache
 * strategies stay fresh after a save.
 *
 * Hosts that already had a hand-rolled `getCachedGlobal` (e.g. the
 * demo) can swap their import for this one without changing the
 * call sites — the shape matches.
 *
 * Usage:
 *
 *   import { getCachedGlobal } from '@justanarthur/payload-www/server'
 *   const header = await getCachedGlobal(configPromise, 'header', 1)()
 */
export const getCachedGlobal = <G extends string>(
  config: Promise<SanitizedConfig>,
  slug: G,
  depth = 0
): (() => Promise<DataFromGlobalSlug<G> | null>) =>
  unstable_cache(
    async () =>
      queryGlobal<G>({
        globalSlug: slug,
        locale: '__ALL__',
        depth,
        config
      }),
    [slug],
    { tags: [`global_${slug}`] }
  ) as () => Promise<DataFromGlobalSlug<G> | null>

/**
 * Type alias for the return shape — matches Payload's
 * `DataFromGlobalSlug<slug>` for typed access in the host.
 */
export type CachedGlobal<G extends string> = DataFromGlobalSlug<G>
