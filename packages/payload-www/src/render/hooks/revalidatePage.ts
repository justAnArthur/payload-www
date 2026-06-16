import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'
// `next/cache` is App-Router-only. Resolved lazily inside the hook
// at request time so `payload.config.ts` (a Node entrypoint) can
// import this module without pulling `next/cache` into its module
// graph at load time.

/**
 * Build per-locale revalidation hooks for a page collection. The
 * page path is `/${locale}/${slug}`; the home page (slug `''`) is
 * `/${locale}`. The lib's Pages collection revalidates the
 * `pages-sitemap` tag on every change so any consumer using
 * `createSitemapHandler` (or `addCollectionsToSitemap`) sees fresh
 * data.
 */
export function createRevalidatePageHooks() {
  const slugToPath = (slug: string | null | undefined, locale: string): string => {
    if (!slug) return `/${locale}`
    return `/${locale}/${slug}`
  }

  const afterChange: CollectionAfterChangeHook = async ({ doc, previousDoc, req: { payload, context, locale } }) => {
    if (context.disableRevalidate) return doc
    const { revalidatePath, revalidateTag } = await import('next/cache')
    const typed = doc as { _status?: string; slug?: string | null }
    const prev = previousDoc as { _status?: string; slug?: string | null } | undefined
    const l = (locale as string) ?? ''
    if (typed._status === 'published') {
      const path = slugToPath(typed.slug, l)
      payload.logger.info(`Revalidating page at path: ${path}`)
      try {
        revalidatePath(path)
        revalidateTag('pages-sitemap', 'max')
      } catch (error) {
        payload.logger.error(`Error revalidating page ${path}: ${String(error)}`)
      }
    }
    if (prev?._status === 'published' && typed._status !== 'published') {
      const oldPath = slugToPath(prev.slug, l)
      payload.logger.info(`Revalidating old page at path: ${oldPath}`)
      try {
        revalidatePath(oldPath)
        revalidateTag('pages-sitemap', 'max')
      } catch (error) {
        payload.logger.error(`Error revalidating old page ${oldPath}: ${String(error)}`)
      }
    }
    return doc
  }

  const afterDelete: CollectionAfterDeleteHook = async ({ doc, req: { payload, context, locale } }) => {
    if (context.disableRevalidate) return doc ?? null
    const { revalidatePath, revalidateTag } = await import('next/cache')
    const typed = doc as { slug?: string | null } | null
    const l = (locale as string) ?? ''
    const path = slugToPath(typed?.slug, l)
    payload.logger.info(`Revalidating deleted page at path: ${path}`)
    try {
      revalidatePath(path)
      revalidateTag('pages-sitemap', 'max')
    } catch (error) {
      payload.logger.error(`Error revalidating deleted page ${path}: ${String(error)}`)
    }
    return doc ?? null
  }

  return { afterChange, afterDelete }
}
