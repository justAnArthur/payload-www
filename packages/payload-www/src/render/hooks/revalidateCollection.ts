import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { allLocales, prefixFor, resolveLocale, type LocalePrefixMode } from '../_locale'
import { safeRevalidatePath, safeRevalidateTag, shouldSkipRevalidate } from './_shared'

export type CreateRevalidateCollectionHookOptions = {
  /**
   * The collection's slug. Used in the per-collection tag fired
   * alongside path invalidation: `collection_<slug>_<id>`.
   */
  collectionSlug: string
  /**
   * URL path prefix for this collection's rendered URLs. Pages use
   * `''` (mounted at root); Posts use `'/posts'`. Leading slash,
   * no trailing slash — same convention as
   * `createSitemapFile.urlPrefixes`.
   */
  urlPathPrefix?: string
  /**
   * Sitemap tag the collection's revalidation hook invalidates on
   * every save. Defaults to `${collectionSlug}-sitemap`. Pass
   * `false` to opt out (collections without a sitemap handler).
   */
  sitemapTag?: string | false
  /**
   * Locale prefix mode — mirrors next-intl's `localePrefix`.
   * Defaults to `'always'` (preserves legacy behavior).
   */
  localePrefix?: LocalePrefixMode
  /**
   * Default locale for `localePrefix: 'as-needed'`. Falls back to
   * `req.payload.config.localization.defaultLocale` at request time
   * when omitted.
   */
  defaultLocale?: string
  /**
   * Path invalidation strategy. Default: `'url'` — fans out
   * `revalidatePath` for every locale × every slug. Set to
   * `'tag-only'` for collections without a URL (e.g. `staticPages`
   * — addressed by a `kind` discriminator, not a slug). Tag-only
   * mode still fires the per-collection tag (via `sitemapTag`) and
   * the per-id tag (`collection_<slug>_<id>`).
   */
  pathMode?: 'url' | 'tag-only'
}

/**
 * Canonical factory for **all** collection revalidation hooks —
 * Pages, Posts, and any host-defined collection.
 *
 * Behavior:
 *
 * - Fires `revalidatePath` for **every** locale the host has
 *   declared (not just the request locale). The path is
 *   `${prefixFor(locale)}${urlPathPrefix}/${slug}` (or
 *   `${prefixFor(locale)}${urlPathPrefix}` for the home page with
 *   empty slug).
 * - Fires `revalidateTag(sitemapTag, 'max')` on every change /
 *   delete so the sitemap handler sees fresh data.
 * - Fires `revalidateTag('collection_<slug>_<id>', 'max')` so
 *   hosts using `unstable_cache` keyed by id stay fresh.
 * - Handles slug renames while published (fires both old and new
 *   paths across all locales).
 * - Respects `req.context.disableRevalidate` for seed / test
 *   scripts.
 *
 * Use `createRevalidateCollectionHook({ ... })` for any
 * collection. For Pages specifically, the lib still exposes
 * `createRevalidatePageHooks()` as a deprecated alias that
 * delegates to this factory with `collectionSlug: 'pages'` and
 * `urlPathPrefix: ''`.
 */
export function createRevalidateCollectionHook(
  options: CreateRevalidateCollectionHookOptions
): { afterChange: CollectionAfterChangeHook; afterDelete: CollectionAfterDeleteHook } {
  const {
    collectionSlug,
    urlPathPrefix = '',
    sitemapTag,
    localePrefix: modeOption,
    defaultLocale: defaultLocaleOption,
    pathMode = 'url'
  } = options

  const resolvedSitemapTag = sitemapTag === false ? false : (sitemapTag ?? `${collectionSlug}-sitemap`)

  console.log('[WWW] render/hooks:createRevalidateCollectionHook collectionSlug=', collectionSlug, 'urlPathPrefix=', urlPathPrefix, 'sitemapTag=', resolvedSitemapTag, 'pathMode=', pathMode)

  const resolveDefaults = (req: unknown) => {
    const mode: LocalePrefixMode = modeOption ?? 'always'
    const defaultLocale =
      defaultLocaleOption ??
      ((req as { payload?: { config?: { localization?: { defaultLocale?: unknown } } } } | null | undefined)?.payload?.config?.localization?.defaultLocale as string | undefined) ??
      ''
    return { mode, defaultLocale }
  }

  const localesToFanOut = (req: unknown): string[] => {
    const all = allLocales(req)
    if (all.length > 0) return all
    const single = resolveLocale(req)
    return single ? [single] : []
  }

  const collectionPath = (
    slug: string | null | undefined,
    locale: string,
    mode: LocalePrefixMode,
    defaultLocale: string
  ): string => {
    const prefix = prefixFor(locale, defaultLocale, mode)
    if (!slug) return `${prefix}${urlPathPrefix}` || '/'
    return `${prefix}${urlPathPrefix}/${slug}`
  }

  const fanOutPaths = async (
    payload: { logger: { error: (m: string) => void; info?: (m: string) => void } },
    req: unknown,
    slug: string | null | undefined,
    label: string
  ) => {
    const { mode, defaultLocale } = resolveDefaults(req)
    const locales = localesToFanOut(req)
    for (const locale of locales) {
      const path = collectionPath(slug, locale, mode, defaultLocale)
      payload.logger.info?.(`${label} ${path}`)
      await safeRevalidatePath(payload, path)
    }
  }

  const fireCollectionTags = async (
    payload: { logger: { error: (m: string) => void } },
    docId: unknown,
    req: unknown
  ) => {
    console.log('[WWW] render/hooks:fireCollectionTags collectionSlug=', collectionSlug, 'docId=', docId)
    if (typeof docId === 'string' || typeof docId === 'number') {
      await safeRevalidateTag(payload, `collection_${collectionSlug}_${docId}`)
    }
    if (resolvedSitemapTag !== false) {
      await safeRevalidateTag(payload, resolvedSitemapTag)
    }
    // The req ref is currently unused at the call site but kept on
    // the helper signature so future per-locale tag work (e.g. a
    // collection_-tag fan-out) can read `req` without changing the
    // helper contract.
    void req
  }

  const afterChange: CollectionAfterChangeHook = async ({ doc, previousDoc, req }) => {
    if (shouldSkipRevalidate(req.context)) return doc
    const { payload } = req
    const typed = doc as { _status?: string; slug?: string | null; id?: string | number }
    const prev = previousDoc as { _status?: string; slug?: string | null } | undefined

    console.log('[WWW] render/hooks:afterChange collectionSlug=', collectionSlug, 'id=', typed.id, 'slug=', typed.slug, 'prevSlug=', prev?.slug)

    const isPublished = typed._status === 'published'
    const wasPublished = prev?._status === 'published'
    const prevSlugIsString = typeof prev?.slug === 'string'
    const slugChanged = prevSlugIsString && prev?.slug !== typed.slug

    if (isPublished) {
      if (pathMode !== 'tag-only') {
        await fanOutPaths(payload, req, typed.slug, `Revalidating ${collectionSlug} at path:`)
      }
      await fireCollectionTags(payload, typed.id, req)
    }

    if (wasPublished && (!isPublished || slugChanged)) {
      if (pathMode !== 'tag-only') {
        await fanOutPaths(payload, req, prev?.slug, `Revalidating old ${collectionSlug} at path:`)
      }
      await fireCollectionTags(payload, typed.id, req)
    }

    return doc
  }

  const afterDelete: CollectionAfterDeleteHook = async ({ doc, req }) => {
    if (shouldSkipRevalidate(req.context)) return doc ?? null
    const { payload } = req
    const typed = doc as { slug?: string | null; id?: string | number } | null

    console.log('[WWW] render/hooks:afterDelete collectionSlug=', collectionSlug, 'id=', typed?.id, 'slug=', typed?.slug)

    if (pathMode !== 'tag-only') {
      await fanOutPaths(payload, req, typed?.slug, `Revalidating deleted ${collectionSlug} at path:`)
    }
    await fireCollectionTags(payload, typed?.id, req)

    return doc ?? null
  }

  return { afterChange, afterDelete }
}

// -------- deprecated Pages alias --------

export type CreateRevalidatePageHooksOptions = Omit<
  CreateRevalidateCollectionHookOptions,
  'collectionSlug' | 'urlPathPrefix'
>

/**
 * @deprecated Use `createRevalidateCollectionHook({ collectionSlug: 'pages', urlPathPrefix: '' })` instead.
 * Kept so hosts that imported this name directly don't break — the
 * alias delegates to the canonical factory with the Pages preset.
 */
export const createRevalidatePageHooks = (
  opts: CreateRevalidatePageHooksOptions = {}
): { afterChange: CollectionAfterChangeHook; afterDelete: CollectionAfterDeleteHook } => {
  console.log('[WWW] render/hooks:createRevalidatePageHooks (deprecated alias) opts=', JSON.stringify(opts))
  return createRevalidateCollectionHook({
    collectionSlug: 'pages',
    urlPathPrefix: '',
    ...opts
  })
}
